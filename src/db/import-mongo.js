import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { pool, closeDB } from '../config/db.js';

const sourceUri = process.env.MONGO_SOURCE_URI;
if (!sourceUri) throw new Error('Define MONGO_SOURCE_URI como URI de solo lectura del MongoDB de origen');
if (!process.env.DATABASE_URL) throw new Error('Define DATABASE_URL para PostgreSQL de destino');

const idOf = (value) => value == null ? null : String(value);
const dateOf = (value) => value == null ? null : new Date(value);
const jsonOf = (value, fallback = null) => value == null ? fallback : JSON.stringify(value);

const client = new MongoClient(sourceUri, { serverSelectionTimeoutMS: 10_000 });
const pg = await pool.connect();

try {
  await client.connect();
  const sourceDb = client.db();
  const occupied = await pg.query(`
    SELECT (SELECT count(*) FROM users) +
           (SELECT count(*) FROM categories) +
           (SELECT count(*) FROM teachers) +
           (SELECT count(*) FROM courses) +
           (SELECT count(*) FROM enrollments) +
           (SELECT count(*) FROM payments) +
           (SELECT count(*) FROM reviews) +
           (SELECT count(*) FROM audit_logs) AS total
  `);
  if (Number(occupied.rows[0].total) !== 0) {
    throw new Error('La importación exige tablas destino vacías; crea una base de datos nueva y vuelve a ejecutar.');
  }

  const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
  const available = new Set(collections.map((item) => item.name));
  const read = async (name) => available.has(name) ? sourceDb.collection(name).find({}).toArray() : [];
  const users = await read('users');
  const categories = await read('categories');
  const oldTeachers = await read('teachers');
  const courses = await read('courses');
  const enrollments = await read('enrollments');
  const payments = await read('payments');
  const reviews = await read('reviews');
  const auditLogs = available.has('auditlogs') ? await read('auditlogs') : await read('audit_logs');

  if (process.argv.includes('--dry-run')) {
    console.log('Conteos de origen:', {
      users: users.length, categories: categories.length, teachers: oldTeachers.length,
      courses: courses.length, enrollments: enrollments.length, payments: payments.length,
      reviews: reviews.length, auditLogs: auditLogs.length
    });
    console.log('Dry run: no se modificó PostgreSQL.');
  } else {
    await pg.query('BEGIN');
    for (const u of users) {
      await pg.query(
        `INSERT INTO users (id,nombre,email,password_hash,telefono,pais,ciudad,rol,activo,eliminado,
          avatar_url,bio,idioma_preferido,ultimo_login,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [idOf(u._id), u.nombre, String(u.email).toLowerCase(), u.passwordHash, u.telefono || '',
          u.pais || '', u.ciudad || '', u.rol || 'estudiante', u.activo !== false,
          u.eliminado === true, u.avatarUrl || null, u.bio || '', u.idiomaPreferido || 'es',
          dateOf(u.ultimoLogin), dateOf(u.createdAt) || new Date(), dateOf(u.updatedAt) || new Date()]
      );
    }
    for (const category of categories) {
      await pg.query(
        `INSERT INTO categories (id,nombre,descripcion,icono,color,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [idOf(category._id), category.nombre, category.descripcion || '',
          category.icono || 'BookOpen', category.color || '#3b82f6',
          dateOf(category.createdAt) || new Date(), dateOf(category.updatedAt) || new Date()]
      );
    }

    const teachersById = new Map();
    const teacherIdByEmail = new Map();
    const teacherAliases = new Map();
    for (const teacher of oldTeachers) {
      const email = String(teacher.email).toLowerCase();
      const existingId = teacherIdByEmail.get(email);
      if (existingId) {
        teacherAliases.set(idOf(teacher._id), existingId);
      } else {
        const id = idOf(teacher._id);
        teachersById.set(id, teacher);
        teacherIdByEmail.set(email, id);
        teacherAliases.set(id, id);
      }
    }
    for (const user of users.filter((item) => item.rol === 'instructor')) {
      const email = String(user.email).toLowerCase();
      const existingId = teacherIdByEmail.get(email);
      if (existingId) {
        teacherAliases.set(idOf(user._id), existingId);
      } else {
        const id = idOf(user._id);
        teachersById.set(id, {
          _id: user._id, nombre: user.nombre, email: user.email, telefono: user.telefono,
          pais: user.pais, ciudad: user.ciudad, activo: user.activo, avatarUrl: user.avatarUrl,
          detallesInstructor: user.detallesInstructor
        });
        teacherIdByEmail.set(email, id);
        teacherAliases.set(id, id);
      }
    }
    for (const teacher of teachersById.values()) {
      await pg.query(
        `INSERT INTO teachers (id,nombre,email,telefono,pais,ciudad,activo,avatar_url,detalles_instructor,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`,
        [idOf(teacher._id), teacher.nombre, String(teacher.email).toLowerCase(),
          teacher.telefono || '', teacher.pais || '', teacher.ciudad || '',
          teacher.activo !== false, teacher.avatarUrl || null,
          jsonOf(teacher.detallesInstructor, {}), dateOf(teacher.createdAt) || new Date(),
          dateOf(teacher.updatedAt) || new Date()]
      );
    }
    for (const c of courses) {
      await pg.query(
        `INSERT INTO courses (id,titulo,descripcion,categoria_id,instructor_id,precio,capacidad,inscritos,
          fecha_inicio,fecha_fin,hora_inicio,hora_fin,dias_semana,horario,zona_horaria,ubicacion,
          numero_aula,estado,publicado,thumbnail_url,nivel,max_estudiantes_sesion,requisitos,
          fecha_publicacion,eliminado,activo,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28)`,
        [idOf(c._id), c.titulo, c.descripcion || '', idOf(c.categoria),
          teacherAliases.get(idOf(c.instructor)) || idOf(c.instructor),
          Number(c.precio || 0), c.capacidad || 20, c.inscritos || 0,
          dateOf(c.fechaInicio) || new Date(), dateOf(c.fechaFin) || new Date(),
          c.horaInicio || '09:00', c.horaFin || '10:00', jsonOf(c.diasSemana, []),
          c.horario || '', c.zonaHoraria || 'UTC', c.ubicacion || 'Online',
          c.numeroAula || null, c.estado || 'draft', c.publicado === true,
          c.thumbnailUrl || null, c.nivel || 'Beginner', c.maxEstudiantesSesion || null,
          c.requisitos || '', dateOf(c.fechaPublicacion), c.eliminado === true,
          c.activo !== false, dateOf(c.createdAt) || new Date(), dateOf(c.updatedAt) || new Date()]
      );
    }
    for (const e of enrollments) {
      await pg.query(
        `INSERT INTO enrollments (id,usuario_id,curso_id,estado_pago,pago_id,monto_pagado,
          estado_completado,certificado_url,nota_final,fecha_inscripcion,fecha_pago,fecha_completado)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [idOf(e._id), idOf(e.usuario), idOf(e.curso), e.estadoPago || 'pending',
          idOf(e.pagoId), e.montoPagado ?? null, e.estadoCompletado || 'not_started',
          e.certificadoUrl || null, e.notaFinal ?? null, dateOf(e.fechaInscripcion) || new Date(),
          dateOf(e.fechaPago), dateOf(e.fechaCompletado)]
      );
    }
    for (const p of payments) {
      await pg.query(
        `INSERT INTO payments (id,inscripcion_id,usuario_id,stripe_payment_id,stripe_customer_id,monto,
          moneda,estado,metodo_pago,ultimos4_digitos,motivo_fallo,comprobante_url,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [idOf(p._id), idOf(p.inscripcion), idOf(p.usuario), p.stripePaymentId,
          p.stripeCustomerId || 'unknown', Number(p.monto || 0), p.moneda || 'USD',
          p.estado || 'pending', p.metodoPago || null, p.ultimos4Digitos || null,
          p.motivoFallo || null, p.comprobanteUrl || null, dateOf(p.createdAt) || new Date(),
          dateOf(p.updatedAt) || new Date()]
      );
    }
    for (const review of reviews) {
      await pg.query(
        `INSERT INTO reviews (id,curso_id,usuario_id,calificacion,comentario,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [idOf(review._id), idOf(review.curso), idOf(review.usuario), review.calificacion,
          review.comentario || '', dateOf(review.createdAt) || new Date(), dateOf(review.updatedAt) || new Date()]
      );
    }
    for (const log of auditLogs) {
      await pg.query(
        `INSERT INTO audit_logs (id,usuario_id,coleccion,operacion,documento_id,valores_anteriores,
          valores_nuevos,motivo_cambio,direccion_ip,user_agent,created_at)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11)`,
        [idOf(log._id), idOf(log.usuario), log.coleccion, log.operacion, idOf(log.documentoId),
          jsonOf(log.valoresAnteriores), jsonOf(log.valoresNuevos), log.motivoCambio || null,
          log.direccionIp || null, log.userAgent || null, dateOf(log.createdAt) || new Date()]
      );
    }
    const importedCounts = await pg.query(`
      SELECT (SELECT count(*) FROM users)::int AS users,
             (SELECT count(*) FROM categories)::int AS categories,
             (SELECT count(*) FROM teachers)::int AS teachers,
             (SELECT count(*) FROM courses)::int AS courses,
             (SELECT count(*) FROM enrollments)::int AS enrollments,
             (SELECT count(*) FROM payments)::int AS payments,
             (SELECT count(*) FROM reviews)::int AS reviews,
             (SELECT count(*) FROM audit_logs)::int AS "auditLogs"
    `);
    const expectedCounts = {
      users: users.length,
      categories: categories.length,
      teachers: teachersById.size,
      courses: courses.length,
      enrollments: enrollments.length,
      payments: payments.length,
      reviews: reviews.length,
      auditLogs: auditLogs.length
    };
    for (const [table, expected] of Object.entries(expectedCounts)) {
      if (importedCounts.rows[0][table] !== expected) {
        throw new Error(`La verificación de ${table} no coincide: se esperaban ${expected}, se encontraron ${importedCounts.rows[0][table]}`);
      }
    }
    await pg.query('COMMIT');
    console.log('Importación completada. Verifica conteos y relaciones antes de cambiar el tráfico.');
    console.log('Conteos importados:', {
      users: users.length, categories: categories.length, teachers: teachersById.size,
      courses: courses.length, enrollments: enrollments.length, payments: payments.length,
      reviews: reviews.length, auditLogs: auditLogs.length
    });
  }
} catch (error) {
  await pg.query('ROLLBACK').catch(() => {});
  console.error('Falló la importación; PostgreSQL hizo rollback y MongoDB no fue modificado:', error);
  process.exitCode = 1;
} finally {
  pg.release();
  await client.close();
  await closeDB();
}
