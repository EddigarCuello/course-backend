import { query } from '../config/db.js';
import { courseSelect, createId, isValidId, mapCourse, toError } from '../db/helpers.js';

const courseColumns = [
  ['titulo', 'titulo'], ['descripcion', 'descripcion'], ['categoria', 'categoria_id'],
  ['instructor', 'instructor_id'], ['precio', 'precio'], ['capacidad', 'capacidad'],
  ['fechaInicio', 'fecha_inicio'], ['fechaFin', 'fecha_fin'], ['horaInicio', 'hora_inicio'],
  ['horaFin', 'hora_fin'], ['diasSemana', 'dias_semana'], ['horario', 'horario'],
  ['zonaHoraria', 'zona_horaria'], ['ubicacion', 'ubicacion'], ['numeroAula', 'numero_aula'],
  ['estado', 'estado'], ['publicado', 'publicado'], ['thumbnailUrl', 'thumbnail_url'],
  ['nivel', 'nivel'], ['maxEstudiantesSesion', 'max_estudiantes_sesion'], ['requisitos', 'requisitos']
];

const createCourse = async (data) => {
  const id = createId();
  const columns = [
    'id', 'titulo', 'descripcion', 'categoria_id', 'instructor_id', 'precio', 'capacidad',
    'fecha_inicio', 'fecha_fin', 'hora_inicio', 'hora_fin', 'dias_semana', 'horario',
    'zona_horaria', 'ubicacion', 'numero_aula', 'estado', 'publicado', 'thumbnail_url',
    'nivel', 'max_estudiantes_sesion', 'requisitos', 'fecha_publicacion', 'activo', 'eliminado'
  ];
  const values = [
    id, data.titulo, data.descripcion || '', data.categoria, data.instructor,
    data.precio ?? 0, data.capacidad ?? 20, data.fechaInicio, data.fechaFin,
    data.horaInicio, data.horaFin, JSON.stringify(data.diasSemana || []), data.horario || '',
    data.zonaHoraria || 'UTC', data.ubicacion || 'Online', data.numeroAula || null,
    data.estado || 'draft', data.publicado ?? false, data.thumbnailUrl || null,
    data.nivel || 'Beginner', data.maxEstudiantesSesion ?? null, data.requisitos || '',
    data.fechaPublicacion || null, data.activo ?? true, data.eliminado ?? false
  ];
  const placeholders = values.map((_, index) => {
    const number = index + 1;
    return columns[index] === 'dias_semana' ? `$${number}::jsonb` : `$${number}`;
  });
  const result = await query(
    `INSERT INTO courses (${columns.join(',')}) VALUES (${placeholders.join(',')}) RETURNING id`,
    values
  );
  const selected = await query(`SELECT ${courseSelect} FROM courses c JOIN categories cat ON cat.id=c.categoria_id JOIN teachers t ON t.id=c.instructor_id WHERE c.id=$1`, [result.rows[0].id]);
  return mapCourse(selected.rows[0]);
};

const listCourses = async (where = '', values = []) => {
  const result = await query(
    `SELECT ${courseSelect} FROM courses c JOIN categories cat ON cat.id=c.categoria_id JOIN teachers t ON t.id=c.instructor_id ${where} ORDER BY c.created_at DESC`,
    values
  );
  return result.rows.map(mapCourse);
};

export const obtenerCursos = async (_req, res, next) => {
  try {
    const data = await listCourses('WHERE c.eliminado = false');
    res.status(200).json({ ok: true, total: data.length, data });
  } catch (error) { next(error); }
};

export const obtenerCursosActivos = async (_req, res, next) => {
  try {
    const data = await listCourses('WHERE c.activo = true AND c.eliminado = false');
    res.status(200).json({ ok: true, total: data.length, data });
  } catch (error) { next(error); }
};

export const obtenerCursoPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return next(toError('El ID del curso no es válido'));
    const data = await listCourses('WHERE c.id = $1 AND c.eliminado = false', [id]);
    if (!data.length) return next(toError('Curso no encontrado', 404));
    res.status(200).json({ ok: true, data: data[0] });
  } catch (error) { next(error); }
};

export const crearCurso = async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.titulo || !data.categoria || !data.instructor || !data.fechaInicio || !data.fechaFin ||
        !data.horaInicio || !data.horaFin || !Array.isArray(data.diasSemana)) {
      return next(toError('Faltan campos obligatorios para registrar el curso'));
    }
    data.fechaPublicacion = data.publicado ? new Date() : null;
    const created = await createCourse(data);
    res.status(201).json({ ok: true, message: 'Curso creado con éxito', data: created });
  } catch (error) { next(error); }
};

export const crearCursosMasivo = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (req.body.cursos || req.body.courses || []);
    if (!items.length) return next(toError('Se requiere una lista no vacía de cursos'));
    const categories = (await query('SELECT id,nombre FROM categories')).rows;
    const teachers = (await query('SELECT id,nombre,email FROM teachers')).rows;
    const creados = [], omitidos = [], errores = [];
    for (const item of items) {
      const titulo = String(item.titulo || item.Title || item.title || '').trim();
      let category = item.categoria || item.categoriaId || item.category;
      if (category && typeof category === 'object') category = category._id || category.id;
      let teacher = item.instructor || item.instructorId || item.teacher;
      if (teacher && typeof teacher === 'object') teacher = teacher._id || teacher.id;
      const categoryMatch = categories.find((c) => c.id === category) ||
        categories.find((c) => c.nombre.toLowerCase() === String(category || item.categoryName || item.categoriaNombre || '').toLowerCase()) ||
        categories[0];
      const teacherMatch = teachers.find((t) => t.id === teacher) ||
        teachers.find((t) => t.email.toLowerCase() === String(teacher || '').toLowerCase() ||
          t.nombre.toLowerCase() === String(teacher || item.instructorNombre || '').toLowerCase()) || teachers[0];
      if (!titulo || !categoryMatch || !teacherMatch) {
        errores.push({ item, motivo: 'Faltan campos clave (título, categoría o instructor)' });
        continue;
      }
      let days = item.diasSemana || item.days;
      if (typeof days === 'string') days = days.split(',').map((day) => day.trim());
      if (!Array.isArray(days) || !days.length) days = ['Lunes'];
      const estado = item.estado || (item.publicado ? 'published' : 'draft');
      const publicado = item.publicado ?? (estado === 'published');
      creados.push(await createCourse({
        titulo, descripcion: item.descripcion || item.Description || item.description || '',
        categoria: categoryMatch.id, instructor: teacherMatch.id,
        precio: Number(item.precio ?? item.Price ?? item.price ?? 0),
        capacidad: Number(item.capacidad ?? item.Capacity ?? item.capacity ?? 20),
        fechaInicio: item.fechaInicio || new Date(),
        fechaFin: item.fechaFin || new Date(Date.now() + 30 * 86400000),
        horaInicio: item.horaInicio || item.timeStart || '09:00',
        horaFin: item.horaFin || item.timeEnd || '11:00',
        diasSemana: days, estado, publicado, fechaPublicacion: publicado ? new Date() : null
      }));
    }
    res.status(201).json({ ok: true, message: `Procesamiento masivo completado. ${creados.length} creados, ${omitidos.length} omitidos, ${errores.length} errores.`, creados, omitidos, errores });
  } catch (error) { next(error); }
};

export const actualizarCurso = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return next(toError('El ID del curso no es válido'));
    const entries = courseColumns.filter(([key]) => req.body[key] !== undefined);
    if (!entries.length) return next(toError('No hay campos válidos para actualizar'));
    const values = entries.map(([key]) => req.body[key]);
    const sets = entries.map(([key, column], index) =>
      `${column} = $${index + 2}${key === 'diasSemana' ? '::jsonb' : ''}`);
    if (req.body.publicado !== undefined) {
      values.push(req.body.publicado ? new Date() : null);
      sets.push(`fecha_publicacion = $${values.length + 1}`);
    }
    const result = await query(
      `UPDATE courses SET ${sets.join(', ')}, updated_at=now() WHERE id=$1 AND eliminado=false RETURNING id`,
      [id, ...values.map((value, index) => entries[index]?.[0] === 'diasSemana' ? JSON.stringify(value) : value)]
    );
    if (!result.rowCount) return next(toError('Curso no encontrado', 404));
    const data = (await listCourses('WHERE c.id=$1', [id]))[0];
    res.status(200).json({ ok: true, message: 'Curso actualizado correctamente', data });
  } catch (error) { next(error); }
};

export const eliminarCurso = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return next(toError('El ID del curso no es válido'));
    const result = await query(
      `UPDATE courses SET eliminado=true, publicado=false, estado='draft', updated_at=now()
       WHERE id=$1 AND eliminado=false`,
      [id]
    );
    if (!result.rowCount) return next(toError('Curso no encontrado', 404));
    res.status(200).json({ ok: true, message: 'Curso eliminado correctamente' });
  } catch (error) { next(error); }
};
