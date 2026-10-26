CREATE TABLE IF NOT EXISTS users (
  id varchar(24) PRIMARY KEY,
  nombre varchar(160) NOT NULL,
  email varchar(320) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  telefono text NOT NULL DEFAULT '',
  pais text NOT NULL DEFAULT '',
  ciudad text NOT NULL DEFAULT '',
  rol text NOT NULL DEFAULT 'estudiante' CHECK (rol IN ('estudiante', 'admin', 'instructor')),
  activo boolean NOT NULL DEFAULT true,
  eliminado boolean NOT NULL DEFAULT false,
  avatar_url text,
  bio text NOT NULL DEFAULT '',
  idioma_preferido text NOT NULL DEFAULT 'es',
  ultimo_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id varchar(24) PRIMARY KEY,
  nombre text NOT NULL UNIQUE,
  descripcion text NOT NULL DEFAULT '',
  icono text NOT NULL DEFAULT 'BookOpen',
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teachers (
  id varchar(24) PRIMARY KEY,
  nombre varchar(160) NOT NULL,
  email varchar(320) NOT NULL UNIQUE,
  telefono text NOT NULL DEFAULT '',
  pais text NOT NULL DEFAULT '',
  ciudad text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  avatar_url text,
  detalles_instructor jsonb NOT NULL DEFAULT '{"especializacion":"","departamento":""}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id varchar(24) PRIMARY KEY,
  titulo text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  categoria_id varchar(24) NOT NULL REFERENCES categories(id),
  instructor_id varchar(24) NOT NULL REFERENCES teachers(id),
  precio numeric(12,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  capacidad integer NOT NULL DEFAULT 20 CHECK (capacidad > 0),
  inscritos integer NOT NULL DEFAULT 0 CHECK (inscritos >= 0),
  fecha_inicio timestamptz NOT NULL,
  fecha_fin timestamptz NOT NULL,
  hora_inicio text NOT NULL,
  hora_fin text NOT NULL,
  dias_semana jsonb NOT NULL DEFAULT '[]'::jsonb,
  horario text NOT NULL DEFAULT '',
  zona_horaria text NOT NULL DEFAULT 'UTC',
  ubicacion text NOT NULL DEFAULT 'Online',
  numero_aula text,
  estado text NOT NULL DEFAULT 'draft' CHECK (estado IN ('draft', 'published', 'finished')),
  publicado boolean NOT NULL DEFAULT false,
  thumbnail_url text,
  nivel text NOT NULL DEFAULT 'Beginner' CHECK (nivel IN ('Beginner', 'Intermediate', 'Advanced')),
  max_estudiantes_sesion integer CHECK (max_estudiantes_sesion IS NULL OR max_estudiantes_sesion > 0),
  requisitos text NOT NULL DEFAULT '',
  fecha_publicacion timestamptz,
  eliminado boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id varchar(24) PRIMARY KEY,
  usuario_id varchar(24) NOT NULL REFERENCES users(id),
  curso_id varchar(24) NOT NULL REFERENCES courses(id),
  estado_pago text NOT NULL DEFAULT 'pending' CHECK (estado_pago IN ('pending', 'paid', 'failed', 'refunded')),
  pago_id varchar(64),
  monto_pagado numeric(12,2) CHECK (monto_pagado IS NULL OR monto_pagado >= 0),
  estado_completado text NOT NULL DEFAULT 'not_started' CHECK (estado_completado IN ('not_started', 'in_progress', 'completed')),
  certificado_url text,
  nota_final numeric(5,2) CHECK (nota_final IS NULL OR (nota_final >= 0 AND nota_final <= 100)),
  fecha_inscripcion timestamptz NOT NULL DEFAULT now(),
  fecha_pago timestamptz,
  fecha_completado timestamptz,
  UNIQUE (usuario_id, curso_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id varchar(24) PRIMARY KEY,
  inscripcion_id varchar(24) NOT NULL REFERENCES enrollments(id),
  usuario_id varchar(24) NOT NULL REFERENCES users(id),
  stripe_payment_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  monto numeric(12,2) NOT NULL CHECK (monto >= 0),
  moneda text NOT NULL DEFAULT 'USD',
  estado text NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending', 'paid', 'failed', 'refunded')),
  metodo_pago text,
  ultimos4_digitos varchar(4),
  motivo_fallo text,
  comprobante_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id varchar(24) PRIMARY KEY,
  curso_id varchar(24) NOT NULL REFERENCES courses(id),
  usuario_id varchar(24) NOT NULL REFERENCES users(id),
  calificacion integer NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curso_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id varchar(24) PRIMARY KEY,
  usuario_id varchar(24) REFERENCES users(id) ON DELETE SET NULL,
  coleccion text NOT NULL,
  operacion text NOT NULL CHECK (operacion IN ('CREATE', 'UPDATE', 'DELETE')),
  documento_id varchar(24) NOT NULL,
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  motivo_cambio text,
  direccion_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courses_active_idx ON courses (activo, eliminado);
CREATE INDEX IF NOT EXISTS payments_user_created_idx ON payments (usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON enrollments (curso_id);
