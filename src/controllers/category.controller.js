import { query } from '../config/db.js';
import { categorySelect, createId, toError } from '../db/helpers.js';

export const obtenerCategorias = async (_req, res, next) => {
  try {
    const result = await query(`SELECT ${categorySelect} FROM categories ORDER BY nombre`);
    res.status(200).json({ ok: true, total: result.rowCount, data: result.rows });
  } catch (error) { next(error); }
};

export const obtenerCategoriaPorId = async (req, res, next) => {
  try {
    const result = await query(`SELECT ${categorySelect} FROM categories WHERE id = $1`, [req.params.id]);
    if (!result.rowCount) return next(toError('Categoría no encontrada', 404));
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

export const crearCategoria = async (req, res, next) => {
  try {
    const { nombre, descripcion = '', icono = 'BookOpen', color = '#3b82f6' } = req.body;
    if (!nombre?.trim()) return next(toError('El nombre de la categoría es obligatorio'));
    const result = await query(
      `INSERT INTO categories (id,nombre,descripcion,icono,color) VALUES ($1,$2,$3,$4,$5)
       RETURNING ${categorySelect}`,
      [createId(), nombre.trim(), descripcion, icono, color]
    );
    res.status(201).json({ ok: true, message: 'Categoría creada con éxito', data: result.rows[0] });
  } catch (error) { next(error); }
};

export const crearCategoriasMasivo = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (req.body.categorias || req.body.categories || []);
    if (!items.length) return next(toError('Se requiere una lista no vacía de categorías'));
    const creadas = [], omitidas = [], errores = [];
    for (const item of items) {
      const nombre = String(item.nombre || item.Nombre || item.name || '').trim();
      if (!nombre) { errores.push({ item, motivo: 'El nombre es obligatorio' }); continue; }
      const existing = await query('SELECT 1 FROM categories WHERE lower(nombre) = lower($1)', [nombre]);
      if (existing.rowCount) { omitidas.push({ nombre, motivo: 'La categoría ya existe' }); continue; }
      const result = await query(
        `INSERT INTO categories (id,nombre,descripcion,icono,color) VALUES ($1,$2,$3,$4,$5) RETURNING ${categorySelect}`,
        [createId(), nombre, item.descripcion || item.Descripcion || item.description || '',
          item.icono || item.Icono || item.icon || 'BookOpen', item.color || item.Color || '#3b82f6']
      );
      creadas.push(result.rows[0]);
    }
    res.status(201).json({ ok: true, message: `Procesamiento masivo completado. ${creadas.length} creadas, ${omitidas.length} omitidas, ${errores.length} errores.`, creadas, omitidas, errores });
  } catch (error) { next(error); }
};

export const actualizarCategoria = async (req, res, next) => {
  try {
    const fields = { nombre: 'nombre', descripcion: 'descripcion', icono: 'icono', color: 'color' };
    const entries = Object.entries(fields).filter(([key]) => req.body[key] !== undefined);
    if (!entries.length) return next(toError('No hay campos válidos para actualizar'));
    const values = entries.map(([key]) => req.body[key]);
    const sets = entries.map(([, column], i) => `${column} = $${i + 2}`);
    const result = await query(
      `UPDATE categories SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING ${categorySelect}`,
      [req.params.id, ...values]
    );
    if (!result.rowCount) return next(toError('Categoría no encontrada', 404));
    res.status(200).json({ ok: true, message: 'Categoría actualizada correctamente', data: result.rows[0] });
  } catch (error) { next(error); }
};

export const eliminarCategoria = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return next(toError('Categoría no encontrada', 404));
    res.status(200).json({ ok: true, message: 'Categoría eliminada correctamente' });
  } catch (error) { next(error); }
};
