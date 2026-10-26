import { randomBytes } from 'node:crypto';

export const createId = () => randomBytes(12).toString('hex');
export const isValidId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

export const userSelect = `
  id AS "_id", id, nombre, email, password_hash AS "passwordHash",
  telefono, pais, ciudad, rol, activo, eliminado, avatar_url AS "avatarUrl",
  bio, idioma_preferido AS "idiomaPreferido", ultimo_login AS "ultimoLogin",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export const categorySelect = `
  id AS "_id", id, nombre, descripcion, icono, color,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export const teacherSelect = `
  id AS "_id", id, nombre, email, telefono, pais, ciudad, activo,
  avatar_url AS "avatarUrl", detalles_instructor AS "detallesInstructor",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export const courseSelect = `
  c.id AS "_id", c.id, c.titulo, c.descripcion,
  c.categoria_id AS categoria,
  json_build_object('_id', cat.id, 'id', cat.id, 'nombre', cat.nombre) AS categoria_data,
  c.instructor_id AS instructor,
  json_build_object('_id', t.id, 'id', t.id, 'nombre', t.nombre, 'email', t.email, 'avatarUrl', t.avatar_url) AS instructor_data,
  c.precio, c.capacidad, c.inscritos, c.fecha_inicio AS "fechaInicio",
  c.fecha_fin AS "fechaFin", c.hora_inicio AS "horaInicio", c.hora_fin AS "horaFin",
  c.dias_semana AS "diasSemana", c.horario, c.zona_horaria AS "zonaHoraria",
  c.ubicacion, c.numero_aula AS "numeroAula", c.estado, c.publicado,
  c.thumbnail_url AS "thumbnailUrl", c.nivel,
  c.max_estudiantes_sesion AS "maxEstudiantesSesion", c.requisitos,
  c.fecha_publicacion AS "fechaPublicacion", c.eliminado, c.activo,
  c.created_at AS "createdAt", c.updated_at AS "updatedAt"`;

export const mapCourse = (row) => {
  if (!row) return row;
  const { categoria_data, instructor_data, ...course } = row;
  course.precio = Number(course.precio);
  if (categoria_data) course.categoria = categoria_data;
  if (instructor_data) course.instructor = instructor_data;
  return course;
};

export const paymentSelect = `
  id AS "_id", id, inscripcion_id AS inscripcion, usuario_id AS usuario,
  stripe_payment_id AS "stripePaymentId", stripe_customer_id AS "stripeCustomerId",
  monto, moneda, estado, metodo_pago AS "metodoPago",
  ultimos4_digitos AS "ultimos4Digitos", motivo_fallo AS "motivoFallo",
  comprobante_url AS "comprobanteUrl", created_at AS "createdAt", updated_at AS "updatedAt"`;

export const enrollmentSelect = `
  id AS "_id", id, usuario_id AS usuario, curso_id AS curso,
  estado_pago AS "estadoPago", pago_id AS "pagoId", monto_pagado AS "montoPagado",
  estado_completado AS "estadoCompletado", certificado_url AS "certificadoUrl",
  nota_final AS "notaFinal", fecha_inscripcion AS "fechaInscripcion",
  fecha_pago AS "fechaPago", fecha_completado AS "fechaCompletado"`;

export const toError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
