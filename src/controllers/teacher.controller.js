import { query } from '../config/db.js';
import { createId, isValidId, teacherSelect, toError } from '../db/helpers.js';

export const obtenerProfesores = async (_req, res, next) => {
  try {
    const result = await query(`SELECT ${teacherSelect} FROM teachers WHERE activo = true ORDER BY nombre`);
    res.status(200).json({ ok: true, total: result.rowCount, data: result.rows });
  } catch (error) { next(error); }
};

export const obtenerTodosProfesores = async (_req, res, next) => {
  try {
    const result = await query(`SELECT ${teacherSelect} FROM teachers ORDER BY nombre`);
    res.status(200).json({ ok: true, total: result.rowCount, data: result.rows });
  } catch (error) { next(error); }
};

export const obtenerProfesorPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = isValidId(id)
      ? await query(`SELECT ${teacherSelect} FROM teachers WHERE id = $1`, [id])
      : await query(`SELECT ${teacherSelect} FROM teachers WHERE lower(email) = lower($1)`, [id]);
    if (!result.rowCount) return next(toError('Docente no encontrado', 404));
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

const createTeacher = async (teacher) => {
  const result = await query(
    `INSERT INTO teachers (id,nombre,email,telefono,pais,ciudad,avatar_url,detalles_instructor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${teacherSelect}`,
    [createId(), teacher.nombre, teacher.email, teacher.telefono || '', teacher.pais || '',
      teacher.ciudad || '', teacher.avatarUrl || null,
      JSON.stringify(teacher.detallesInstructor || { especializacion: '', departamento: '' })]
  );
  return result.rows[0];
};

export const registrarProfesor = async (req, res, next) => {
  try {
    const { nombre, email, telefono, pais, ciudad, avatarUrl, detallesInstructor } = req.body;
    if (!nombre || !email) return next(toError('Nombre y email son obligatorios'));
    const data = await createTeacher({
      nombre: nombre.trim(), email: email.trim().toLowerCase(), telefono, pais, ciudad, avatarUrl, detallesInstructor
    });
    res.status(201).json({ ok: true, message: 'Profesor registrado con éxito', data });
  } catch (error) { next(error); }
};

export const registrarProfesoresMasivo = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.teachers;
    if (!Array.isArray(items) || !items.length) return next(toError('Se requiere una lista no vacía de profesores'));
    const creados = [], omitidos = [], errores = [];
    for (const item of items) {
      const nombre = String(item.nombre || item.Nombre || item.name || '').trim();
      const email = String(item.email || item.Email || item.correo || '').trim().toLowerCase();
      if (!nombre || !email) { errores.push({ item, motivo: 'Nombre y email son requeridos' }); continue; }
      const existing = await query('SELECT 1 FROM teachers WHERE email = $1', [email]);
      if (existing.rowCount) { omitidos.push({ email, motivo: 'El correo electrónico ya existe' }); continue; }
      creados.push(await createTeacher({
        nombre, email, telefono: item.telefono || item.Telefono || item.phone || '',
        pais: item.pais || item.Pais || item.country || '',
        ciudad: item.ciudad || item.Ciudad || item.city || '',
        avatarUrl: item.avatarUrl,
        detallesInstructor: {
          especializacion: item.especializacion || item.Especializacion || item.detallesInstructor?.especializacion || '',
          departamento: item.departamento || item.Departamento || item.detallesInstructor?.departamento || ''
        }
      }));
    }
    res.status(201).json({ ok: true, message: `Procesamiento masivo completado. ${creados.length} creados, ${omitidos.length} omitidos, ${errores.length} errores.`, creados, omitidos, errores });
  } catch (error) { next(error); }
};

export const actualizarProfesor = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return next(toError('El ID enviado no es válido'));
    const mapping = {
      nombre: 'nombre', telefono: 'telefono', pais: 'pais', ciudad: 'ciudad',
      activo: 'activo', avatarUrl: 'avatar_url'
    };
    const entries = Object.entries(mapping).filter(([key]) => req.body[key] !== undefined);
    const values = entries.map(([key]) => req.body[key]);
    const sets = entries.map(([, column], i) => `${column} = $${i + 2}`);
    if (req.body.detallesInstructor !== undefined) {
      values.push(JSON.stringify(req.body.detallesInstructor));
      sets.push(`detalles_instructor = $${values.length + 1}::jsonb`);
    }
    if (!sets.length) return next(toError('No hay campos válidos para actualizar'));
    const result = await query(
      `UPDATE teachers SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING ${teacherSelect}`,
      [id, ...values]
    );
    if (!result.rowCount) return next(toError('Profesor no encontrado', 404));
    res.status(200).json({ ok: true, message: 'Profesor actualizado correctamente', data: result.rows[0] });
  } catch (error) { next(error); }
};

export const eliminarProfesor = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return next(toError('El ID enviado no es válido'));
    const result = await query('DELETE FROM teachers WHERE id = $1', [id]);
    if (!result.rowCount) return next(toError('Profesor no encontrado', 404));
    res.status(200).json({ ok: true, message: 'Profesor eliminado correctamente' });
  } catch (error) { next(error); }
};
