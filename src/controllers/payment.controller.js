import Stripe from 'stripe';
import { pool, query } from '../config/db.js';
import { createId, enrollmentSelect, isValidId, paymentSelect, toError } from '../db/helpers.js';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY es obligatorio para procesar pagos');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const getClientUrl = () => {
  if (!process.env.CLIENT_URL) throw new Error('CLIENT_URL es obligatorio para iniciar pagos');
  return process.env.CLIENT_URL.replace(/\/$/, '');
};

const mapPayment = (payment) => ({
  _id: payment.id,
  id: payment.id,
  inscripcion: payment.inscripcion_id,
  usuario: payment.usuario_id,
  stripePaymentId: payment.stripe_payment_id,
  stripeCustomerId: payment.stripe_customer_id,
  monto: Number(payment.monto),
  moneda: payment.moneda,
  estado: payment.estado,
  metodoPago: payment.metodo_pago,
  ultimos4Digitos: payment.ultimos4_digitos,
  motivoFallo: payment.motivo_fallo,
  comprobanteUrl: payment.comprobante_url,
  createdAt: payment.created_at,
  updatedAt: payment.updated_at
});

const getPaymentCourse = async (client, courseId) => {
  const result = await client.query(
    'SELECT id,titulo,descripcion,precio,capacidad,inscritos FROM courses WHERE id=$1 AND eliminado=false',
    [courseId]
  );
  return result.rows[0];
};

export const createCheckoutSession = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    if (!isValidId(courseId)) return next(toError('courseId no es válido'));
    const courseResult = await query(
      'SELECT id,titulo,descripcion,precio FROM courses WHERE id=$1 AND eliminado=false AND activo=true',
      [courseId]
    );
    const course = courseResult.rows[0];
    if (!course) return next(toError('Curso no encontrado', 404));
    const stripe = getStripe();
    const clientUrl = getClientUrl();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(course.precio) * 100),
          product_data: { name: course.titulo, description: course.descripcion?.slice(0, 150) || 'Inscripción al curso' }
        },
        quantity: 1
      }],
      metadata: { courseId, userId: req.user.id, userEmail: req.user.email || '' },
      customer_email: req.user.email || undefined,
      success_url: `${clientUrl}/pagos?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${clientUrl}/catalog?status=cancelled`
    });
    res.status(200).json({ ok: true, url: session.url, sessionId: session.id });
  } catch (error) { next(error); }
};

export const verifyCheckoutSession = async (req, res, next) => {
  const client = await pool.connect();
  let paymentKey;
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;
    if (!sessionId) return res.status(400).json({ error: 'sessionId es requerido.' });
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(400).json({ error: 'El pago no se ha completado en Stripe.' });
    if (session.metadata?.userId !== userId) return res.status(403).json({ error: 'La sesión de pago no pertenece al usuario.' });
    const courseId = session.metadata.courseId;
    if (!isValidId(courseId)) return next(toError('El curso asociado al pago no es válido'));

    paymentKey = session.payment_intent || session.id;
    const existing = await query(`SELECT ${paymentSelect} FROM payments WHERE stripe_payment_id=$1`, [paymentKey]);
    if (existing.rowCount) return res.status(200).json({ ok: true, message: 'Pago ya registrado', payment: existing.rows[0] });

    const stripe = getStripe();
    let paymentMethod = null, last4 = null;
    if (session.payment_intent) {
      const intent = await stripe.paymentIntents.retrieve(session.payment_intent);
      if (intent.payment_method) {
        const method = await stripe.paymentMethods.retrieve(intent.payment_method);
        paymentMethod = method.card?.brand || method.type;
        last4 = method.card?.last4 || null;
      }
    }

    await client.query('BEGIN');
    const course = await getPaymentCourse(client, courseId);
    if (!course) throw toError('Curso no encontrado', 404);
    const enrollmentResult = await client.query(
      `INSERT INTO enrollments (id,usuario_id,curso_id,estado_pago,monto_pagado,fecha_pago)
       VALUES ($1,$2,$3,'paid',$4,now())
       ON CONFLICT (usuario_id,curso_id) DO UPDATE SET estado_pago='paid',
         monto_pagado=EXCLUDED.monto_pagado, fecha_pago=now() RETURNING ${enrollmentSelect}`,
      [createId(), userId, courseId, session.amount_total / 100]
    );
    const enrollment = enrollmentResult.rows[0];
    await client.query('UPDATE courses SET inscritos=(SELECT count(*) FROM enrollments WHERE curso_id=$1), updated_at=now() WHERE id=$1', [courseId]);
    const paymentResult = await client.query(
      `INSERT INTO payments (id,inscripcion_id,usuario_id,stripe_payment_id,stripe_customer_id,monto,moneda,estado,metodo_pago,ultimos4_digitos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'paid',$8,$9) RETURNING ${paymentSelect}`,
      [createId(), enrollment.id, userId, paymentKey, session.customer || 'unknown',
        session.amount_total / 100, (session.currency || 'usd').toUpperCase(), paymentMethod, last4]
    );
    await client.query('UPDATE enrollments SET pago_id=$1 WHERE id=$2', [paymentResult.rows[0].id, enrollment.id]);
    await client.query('COMMIT');
    res.status(200).json({ ok: true, message: 'Pago verificado e inscripción exitosa', payment: paymentResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') {
      try {
        const existing = paymentKey
          ? await query(`SELECT ${paymentSelect} FROM payments WHERE stripe_payment_id=$1`, [paymentKey])
          : { rowCount: 0, rows: [] };
        if (existing.rowCount) return res.status(200).json({ ok: true, message: 'Pago ya registrado', payment: existing.rows[0] });
      } catch (lookupError) { return next(lookupError); }
    }
    next(error);
  } finally {
    client.release();
  }
};

export const getMyPayments = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT row_to_json(p) AS payment,
         json_build_object('_id',e.id,'id',e.id,'estadoPago',e.estado_pago,'montoPagado',e.monto_pagado,
           'fechaInscripcion',e.fecha_inscripcion,'fechaPago',e.fecha_pago,
           'curso',json_build_object('_id',c.id,'id',c.id,'titulo',c.titulo,'precio',c.precio,
             'diasSemana',c.dias_semana,'horaInicio',c.hora_inicio,'horaFin',c.hora_fin,
             'capacidad',c.capacidad,'inscritos',c.inscritos,'descripcion',c.descripcion,
             'instructor',json_build_object('_id',t.id,'id',t.id,'nombre',t.nombre))) AS inscripcion
       FROM payments p JOIN enrollments e ON e.id=p.inscripcion_id
       JOIN courses c ON c.id=e.curso_id JOIN teachers t ON t.id=c.instructor_id
       WHERE p.usuario_id=$1 ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    const payments = result.rows.map(({ payment, inscripcion }) => ({
      ...mapPayment(payment), inscripcion
    }));
    res.status(200).json({ payments });
  } catch (error) { next(error); }
};

export const registerCashEnrollment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { courseId } = req.body;
    const userId = req.user.id;
    if (!isValidId(courseId)) return res.status(400).json({ error: 'courseId es requerido y debe ser válido.' });
    await client.query('BEGIN');
    const course = await getPaymentCourse(client, courseId);
    if (!course) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }
    const old = await client.query('SELECT id FROM enrollments WHERE usuario_id=$1 AND curso_id=$2', [userId, courseId]);
    if (old.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ya tienes una inscripción para este curso.' });
    }
    const subtotal = Number(course.precio) * 0.85;
    const total = subtotal * 1.12;
    const enrollment = (await client.query(
      `INSERT INTO enrollments (id,usuario_id,curso_id,estado_pago,monto_pagado)
       VALUES ($1,$2,$3,'pending',$4) RETURNING ${enrollmentSelect}`,
      [createId(), userId, courseId, total]
    )).rows[0];
    await client.query('UPDATE courses SET inscritos=(SELECT count(*) FROM enrollments WHERE curso_id=$1), updated_at=now() WHERE id=$1', [courseId]);
    const payment = (await client.query(
      `INSERT INTO payments (id,inscripcion_id,usuario_id,stripe_payment_id,stripe_customer_id,monto,moneda,estado,metodo_pago)
       VALUES ($1,$2,$3,$4,'cash-transfer',$5,'USD','pending','cash_transfer') RETURNING ${paymentSelect}`,
      [createId(), enrollment.id, userId, `cash_${userId}_${courseId}_${Date.now()}`, total]
    )).rows[0];
    await client.query('UPDATE enrollments SET pago_id=$1 WHERE id=$2', [payment.id, enrollment.id]);
    await client.query('COMMIT');
    enrollment.pagoId = payment.id;
    res.status(201).json({ ok: true, message: 'Inscripción registrada. Por favor realiza el pago por efectivo o transferencia.', payment, enrollment });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
};

export const getAllPayments = async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT row_to_json(p) AS payment,
         json_build_object('_id',e.id,'id',e.id,'estadoPago',e.estado_pago,'montoPagado',e.monto_pagado,
           'fechaInscripcion',e.fecha_inscripcion,'fechaPago',e.fecha_pago,
           'curso',json_build_object('_id',c.id,'id',c.id,'titulo',c.titulo,'precio',c.precio,
             'diasSemana',c.dias_semana,'horaInicio',c.hora_inicio,'horaFin',c.hora_fin,
             'capacidad',c.capacidad,'inscritos',c.inscritos,'descripcion',c.descripcion,
             'instructor',json_build_object('_id',t.id,'id',t.id,'nombre',t.nombre))) AS inscripcion,
         json_build_object('_id',u.id,'id',u.id,'nombre',u.nombre,'email',u.email,'avatarUrl',u.avatar_url) AS usuario
       FROM payments p JOIN enrollments e ON e.id=p.inscripcion_id
       JOIN courses c ON c.id=e.curso_id JOIN teachers t ON t.id=c.instructor_id
       JOIN users u ON u.id=p.usuario_id ORDER BY p.created_at DESC`
    );
    const payments = result.rows.map(({ payment, inscripcion, usuario }) => ({
      ...mapPayment(payment), inscripcion, usuario
    }));
    res.status(200).json({ payments });
  } catch (error) { next(error); }
};

export const updatePaymentStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { paymentId } = req.params;
    const { status } = req.body;
    if (!isValidId(paymentId)) return res.status(400).json({ error: 'ID de pago inválido.' });
    if (!['paid', 'pending', 'failed', 'refunded'].includes(status)) return res.status(400).json({ error: 'Estado de pago inválido.' });
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE payments SET estado=$2,updated_at=now() WHERE id=$1 RETURNING ${paymentSelect}`,
      [paymentId, status]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }
    const payment = result.rows[0];
    await client.query(
      `UPDATE enrollments SET estado_pago=$2,fecha_pago=CASE WHEN $2='paid' THEN COALESCE(fecha_pago,now()) ELSE fecha_pago END
       WHERE id=$1`,
      [payment.inscripcion, status]
    );
    await client.query('COMMIT');
    res.status(200).json({ ok: true, message: 'Estado de pago actualizado', payment });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client.release(); }
};

export const uploadReceipt = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });
    if (!isValidId(paymentId)) return res.status(400).json({ error: 'ID de pago inválido.' });
    const fileUrl = `/uploads/${req.file.filename}`;
    const result = await query(
      `UPDATE payments SET comprobante_url=$2,updated_at=now() WHERE id=$1 RETURNING id`,
      [paymentId, fileUrl]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Pago no encontrado.' });
    res.status(200).json({ ok: true, message: 'Comprobante subido correctamente', comprobanteUrl: fileUrl });
  } catch (error) { next(error); }
};
