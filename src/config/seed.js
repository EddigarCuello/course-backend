import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from './db.js';
import { createId } from '../db/helpers.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const readJson = async (name) => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));

export const seedDatabase = async () => {
  const categories = await readJson('Categories.json');
  for (const item of categories) {
    await query(
      `INSERT INTO categories (id,nombre,descripcion,icono,color)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (nombre) DO NOTHING`,
      [createId(), item.nombre, item.descripcion || '', item.icono || 'BookOpen', item.color || '#3b82f6']
    );
  }

  const teachers = await readJson('teachers.json');
  for (const item of teachers) {
    const existing = await query('SELECT id FROM teachers WHERE lower(email)=lower($1)', [item.email]);
    const id = existing.rows[0]?.id || createId();
    await query(
      `INSERT INTO teachers (id,nombre,email,telefono,pais,ciudad,activo,avatar_url,detalles_instructor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (email) DO NOTHING`,
      [id, item.nombre, item.email.toLowerCase(), item.telefono || '', item.pais || '',
        item.ciudad || '', item.activo !== false, item.avatarUrl || null,
        JSON.stringify(item.detallesInstructor || {})]
    );
  }

  const count = await query('SELECT count(*)::int AS total FROM courses');
  if (count.rows[0].total > 0) return;
  const [courseData, categoryRows, teacherRows] = await Promise.all([
    readJson('cursos.json'),
    query('SELECT id FROM categories ORDER BY nombre'),
    query('SELECT id FROM teachers ORDER BY nombre')
  ]);
  if (!categoryRows.rowCount || !teacherRows.rowCount) throw new Error('No hay categorías o instructores para sembrar cursos');
  for (let index = 0; index < courseData.length; index += 1) {
    const course = courseData[index];
    const values = [
      createId(), course.titulo || course.title || 'Curso', course.descripcion || course.description || '',
      categoryRows.rows[index % categoryRows.rowCount].id,
      teacherRows.rows[index % teacherRows.rowCount].id,
      Number(course.precio ?? course.price ?? 0), Number(course.capacidad ?? course.capacity ?? 20),
      course.fechaInicio || new Date(), course.fechaFin || new Date(Date.now() + 30 * 86400000),
      course.horaInicio || '09:00', course.horaFin || '11:00',
      JSON.stringify(course.diasSemana || ['Lunes']), course.horario || '', course.zonaHoraria || 'UTC',
      course.ubicacion || 'Online', course.numeroAula || null, 'published', false,
      course.thumbnailUrl || null, course.nivel || 'Beginner', course.maxEstudiantesSesion || null,
      course.requisitos || ''
    ];
    await query(
      `INSERT INTO courses (id,titulo,descripcion,categoria_id,instructor_id,precio,capacidad,
        fecha_inicio,fecha_fin,hora_inicio,hora_fin,dias_semana,horario,zona_horaria,ubicacion,
        numero_aula,estado,publicado,thumbnail_url,nivel,max_estudiantes_sesion,requisitos,fecha_publicacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,NULL)`,
      values
    );
  }
};
