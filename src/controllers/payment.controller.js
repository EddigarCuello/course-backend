import Stripe from 'stripe';
import { CourseModel } from '../models/course.schema.js';
import { EnrollmentModel } from '../models/enrollment.schema.js';
import { PaymentModel } from '../models/payment.schema.js';

const stripeSecretKey = (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim())
  ? process.env.STRIPE_SECRET_KEY.trim()
  : 'sk_test_dummy_key_placeholder_for_development';
const stripe = new Stripe(stripeSecretKey);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * POST /api/payments/create-checkout-session
 * Crea una sesión de Stripe Checkout para un curso.
 * Requiere: { courseId } en el body.
 * Requiere: token JWT (req.user inyectado por authRequired).
 */
export const createCheckoutSession = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      const error = new Error('courseId es requerido.');
      error.statusCode = 400;
      return next(error);
    }

    // Buscar el curso en la base de datos
    const course = await CourseModel.findById(courseId);
    if (!course) {
      const error = new Error('Curso no encontrado.');
      error.statusCode = 404;
      return next(error);
    }

    const precio = Number(course.precio ?? 0);
    const titulo = course.titulo || course.title || 'Curso Vacacional';

    // Crear la sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(precio * 100), // Stripe usa centavos
            product_data: {
              name: titulo,
              description: course.descripcion?.slice(0, 150) || 'Inscripción al curso vacacional',
            },
          },
          quantity: 1,
        },
      ],
      // Metadata para poder identificar el pago después
      metadata: {
        courseId: courseId.toString(),
        userId: req.user?.id || req.user?._id || 'guest',
        userEmail: req.user?.email || '',
      },
      customer_email: req.user?.email || undefined,
      success_url: `${CLIENT_URL}/pagos?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${CLIENT_URL}/catalog?status=cancelled`,
    });

    res.status(200).json({ ok: true, url: session.url, sessionId: session.id });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/verify-session
 * Verifica una sesión de Stripe Checkout usando el session_id.
 * Si el pago fue exitoso, registra la inscripción y el pago en la BD.
 * Requiere: { sessionId } en el body.
 * Requiere: token JWT (req.user inyectado por authRequired).
 */
export const verifyCheckoutSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId es requerido.' });
    }

    // Obtener la sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'El pago no se ha completado en Stripe.' });
    }

    const courseId = session.metadata.courseId;

    // Comprobar si ya existe el pago en la BD para evitar duplicados
    const existingPayment = await PaymentModel.findOne({ stripePaymentId: session.payment_intent });
    if (existingPayment) {
       return res.status(200).json({ ok: true, message: 'Pago ya registrado', payment: existingPayment });
    }

    // Verificar si ya está inscrito
    const existingEnrollment = await EnrollmentModel.findOne({ usuario: userId, curso: courseId });
    let enrollment;

    if (!existingEnrollment) {
      // 1. Crear Enrollment
      enrollment = await EnrollmentModel.create({
        usuario: userId,
        curso: courseId,
        estadoPago: 'paid',
        montoPagado: session.amount_total / 100, // Stripe devuelve en centavos
        fechaPago: new Date()
      });

      // 2. Incrementar inscritos del curso
      await CourseModel.findByIdAndUpdate(courseId, { $inc: { inscritos: 1 } });
    } else {
      enrollment = existingEnrollment;
      // Actualizar si estaba pendiente
      if (enrollment.estadoPago !== 'paid') {
         enrollment.estadoPago = 'paid';
         enrollment.montoPagado = session.amount_total / 100;
         enrollment.fechaPago = new Date();
         await enrollment.save();
      }
    }

    // 3. Obtener Payment Intent para sacar detalles de la tarjeta si aplica
    let paymentMethod = null;
    let last4 = null;

    if (session.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
        if (paymentIntent.payment_method) {
            const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
            paymentMethod = pm.card?.brand || pm.type;
            last4 = pm.card?.last4;
        }
    }

    // 4. Registrar Pago
    const newPayment = await PaymentModel.create({
      inscripcion: enrollment._id,
      usuario: userId,
      stripePaymentId: session.payment_intent || session.id,
      stripeCustomerId: session.customer || 'unknown',
      monto: session.amount_total / 100,
      moneda: session.currency,
      estado: 'paid',
      metodoPago: paymentMethod,
      ultimos4Digitos: last4
    });

    // Actualizar enrollment con el ID del pago
    enrollment.pagoId = newPayment._id;
    await enrollment.save();

    res.status(200).json({ ok: true, message: 'Pago verificado e inscripción exitosa', payment: newPayment });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/me
 * Obtiene el historial de pagos del usuario autenticado.
 */
export const getMyPayments = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const payments = await PaymentModel.find({ usuario: userId })
      .populate({
        path: 'inscripcion',
        populate: {
          path: 'curso',
          select: 'titulo title precio diasSemana horaInicio horaFin capacidad inscritos descripcion instructor',
          populate: { path: 'instructor', select: 'nombre' }
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ payments });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/register-cash
 * Registra una inscripción por efectivo/transferencia (queda en estado 'pending').
 * Requiere: { courseId } en el body.
 * Requiere: token JWT (req.user inyectado por authRequired).
 */
export const registerCashEnrollment = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId es requerido.' });
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }

    // Verificar si ya está inscrito
    const existingEnrollment = await EnrollmentModel.findOne({ usuario: userId, curso: courseId });
    if (existingEnrollment) {
      return res.status(409).json({ error: 'Ya tienes una inscripción para este curso.' });
    }

    const precio = Number(course.precio ?? 0);
    const discount = precio * 0.15;
    const taxes = (precio - discount) * 0.12;
    const total = precio - discount + taxes;

    // Crear Enrollment en estado pending
    const enrollment = await EnrollmentModel.create({
      usuario: userId,
      curso: courseId,
      estadoPago: 'pending',
      montoPagado: total,
      fechaPago: null
    });

    // Incrementar inscritos del curso (reservar el cupo)
    await CourseModel.findByIdAndUpdate(courseId, { $inc: { inscritos: 1 } });

    // Crear registro de pago en estado pending con ID temporal
    const tempPaymentId = `cash_${userId}_${courseId}_${Date.now()}`;
    const newPayment = await PaymentModel.create({
      inscripcion: enrollment._id,
      usuario: userId,
      stripePaymentId: tempPaymentId,
      stripeCustomerId: 'cash-transfer',
      monto: total,
      moneda: 'USD',
      estado: 'pending',
      metodoPago: 'cash_transfer',
      ultimos4Digitos: null
    });

    enrollment.pagoId = newPayment._id;
    await enrollment.save();

    res.status(201).json({
      ok: true,
      message: 'Inscripción registrada. Por favor realiza el pago por efectivo o transferencia.',
      payment: newPayment,
      enrollment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/admin/all
 * Obtiene todos los pagos registrados (para el panel de admin).
 */
export const getAllPayments = async (req, res, next) => {
  try {
    const payments = await PaymentModel.find()
      .populate({
        path: 'inscripcion',
        populate: {
          path: 'curso',
          select: 'titulo title precio diasSemana horaInicio horaFin capacidad inscritos descripcion instructor',
          populate: { path: 'instructor', select: 'nombre' }
        }
      })
      .populate({
        path: 'usuario',
        select: 'nombre email avatarUrl'
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ payments });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/payments/admin/:paymentId/status
 * Actualiza el estado de un pago (ej. de pending a paid o failed).
 */
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    if (!['paid', 'pending', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'Estado de pago inválido.' });
    }

    const payment = await PaymentModel.findById(paymentId).populate('inscripcion');
    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    payment.estado = status;
    await payment.save();

    // Sincronizar el estado en la inscripción correspondiente
    if (payment.inscripcion) {
      const enrollment = await EnrollmentModel.findById(payment.inscripcion._id);
      if (enrollment) {
        enrollment.estadoPago = status;
        if (status === 'paid' && !enrollment.fechaPago) {
           enrollment.fechaPago = new Date();
        }
        await enrollment.save();
      }
    }

    res.status(200).json({ ok: true, message: 'Estado de pago actualizado', payment });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/:paymentId/receipt
 * Sube el comprobante de pago para pagos en efectivo/transferencia.
 */
export const uploadReceipt = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    // Guardar la URL local del archivo
    // Asumimos que la app se sirve desde el mismo host en desarrollo
    const fileUrl = `/uploads/${req.file.filename}`;
    
    payment.comprobanteUrl = fileUrl;
    await payment.save();

    res.status(200).json({ 
      ok: true, 
      message: 'Comprobante subido correctamente', 
      comprobanteUrl: fileUrl 
    });
  } catch (error) {
    next(error);
  }
};
