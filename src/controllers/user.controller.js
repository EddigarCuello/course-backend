import { query } from '../config/db.js';
import { createId, isValidId, toError, userSelect } from '../db/helpers.js';
import bcrypt from 'bcryptjs';

const publicUserSelect = userSelect.replace(', password_hash AS "passwordHash"', '');

export const obtenerUsuarios = async (_req, res, next) => {
  try {
    const result = await query(`SELECT ${publicUserSelect} FROM users WHERE eliminado = false ORDER BY nombre`);
    res.status(200).json({ ok: true, data: result.rows });
  } catch (error) { next(error); }
};

export const obtenerUsuarioPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = isValidId(id)
      ? await query(`SELECT ${publicUserSelect} FROM users WHERE id = $1 AND eliminado = false`, [id])
      : await query(`SELECT ${publicUserSelect} FROM users WHERE lower(email) = lower($1) AND eliminado = false`, [id]);
    if (!result.rowCount) return next(toError('Usuario no encontrado', 404));
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

export const registrarUsuario = async (req, res, next) => {
  try {
    const { nombre, email, password, telefono, pais, ciudad, avatarUrl, bio, idiomaPreferido } = req.body;
    if (!nombre || !email || !password) return next(toError('Nombre, email y contraseña son obligatorios'));
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (id,nombre,email,password_hash,telefono,pais,ciudad,avatar_url,bio,idioma_preferido)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${publicUserSelect}`,
      [createId(), nombre.trim(), String(email).trim().toLowerCase(), hash, telefono || '', pais || '', ciudad || '', avatarUrl || null, bio || '', idiomaPreferido || 'es']
    );
    res.status(201).json({ ok: true, message: 'Usuario registrado con éxito', data: result.rows[0] });
  } catch (error) { next(error); }
};

export const actualizarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return next(toError('El ID del usuario no es válido'));
    const allowed = {
      nombre: 'nombre', telefono: 'telefono', pais: 'pais', ciudad: 'ciudad',
      activo: 'activo', avatarUrl: 'avatar_url', bio: 'bio', idiomaPreferido: 'idioma_preferido'
    };
    const entries = Object.entries(allowed).filter(([key]) => req.body[key] !== undefined);
    if (!entries.length) return next(toError('No hay campos válidos para actualizar'));
    const values = entries.map(([key]) => req.body[key]);
    const assignments = entries.map(([key, column], index) => `${column} = $${index + 2}`);
    const result = await query(
      `UPDATE users SET ${assignments.join(', ')}, updated_at = now()
       WHERE id = $1 AND eliminado = false RETURNING ${publicUserSelect}`,
      [id, ...values]
    );
    if (!result.rowCount) return next(toError('Usuario no encontrado', 404));
    res.status(200).json({ ok: true, message: 'Usuario actualizado correctamente', data: result.rows[0] });
  } catch (error) { next(error); }
};

export const eliminarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return next(toError('El ID del usuario no es válido'));
    const result = await query(
      'UPDATE users SET eliminado = true, activo = false, updated_at = now() WHERE id = $1 AND eliminado = false',
      [id]
    );
    if (!result.rowCount) return next(toError('Usuario no encontrado', 404));
    res.status(200).json({ ok: true, message: 'Usuario eliminado correctamente' });
  } catch (error) { next(error); }
};
