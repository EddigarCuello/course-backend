import { CategoryModel } from '../models/category.schema.js';

// GET /api/categories - Obtener todas las categorías
export const obtenerCategorias = async (req, res, next) => {
  try {
    const categorias = await CategoryModel.find();
    res.status(200).json({
      ok: true,
      total: categorias.length,
      data: categorias
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/categories/:id - Obtener categoría por ID
export const obtenerCategoriaPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const categoria = await CategoryModel.findById(id);

    if (!categoria) {
      const error = new Error('Categoría no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      data: categoria
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/categories - Crear nueva categoría
export const crearCategoria = async (req, res, next) => {
  try {
    const { nombre, descripcion, icono, color } = req.body;

    if (!nombre) {
      const error = new Error('El nombre de la categoría es obligatorio');
      error.statusCode = 400;
      return next(error);
    }

    const nuevaCategoria = await CategoryModel.create({
      nombre,
      descripcion,
      icono,
      color
    });

    res.status(201).json({
      ok: true,
      message: 'Categoría creada con éxito',
      data: nuevaCategoria
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/categories/bulk - Carga masiva de categorías
export const crearCategoriasMasivo = async (req, res, next) => {
  try {
    const lista = Array.isArray(req.body) ? req.body : (req.body.categorias || req.body.categories || []);

    if (!Array.isArray(lista) || lista.length === 0) {
      const error = new Error('Se requiere una lista no vacía de categorías');
      error.statusCode = 400;
      return next(error);
    }

    const creadas = [];
    const omitidas = [];
    const errores = [];

    for (const item of lista) {
      const nombre = (item.nombre || item.Nombre || item.name || '').toString().trim();
      const descripcion = (item.descripcion || item.Descripcion || item.description || '').toString().trim();
      const icono = (item.icono || item.Icono || item.icon || 'BookOpen').toString().trim();
      const color = (item.color || item.Color || '#3b82f6').toString().trim();

      if (!nombre) {
        errores.push({ item, motivo: 'El nombre es obligatorio' });
        continue;
      }

      const existe = await CategoryModel.findOne({ nombre: { $regex: new RegExp(`^${nombre}$`, 'i') } });
      if (existe) {
        omitidas.push({ nombre, motivo: 'La categoría ya existe' });
        continue;
      }

      const nueva = await CategoryModel.create({
        nombre,
        descripcion,
        icono,
        color
      });
      creadas.push(nueva);
    }

    res.status(201).json({
      ok: true,
      message: `Procesamiento masivo completado. ${creadas.length} creadas, ${omitidas.length} omitidas, ${errores.length} errores.`,
      creadas,
      omitidas,
      errores
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/categories/:id - Actualizar categoría
export const actualizarCategoria = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, icono, color } = req.body;

    const categoriaActualizada = await CategoryModel.findByIdAndUpdate(
      id,
      { nombre, descripcion, icono, color },
      { new: true, runValidators: true }
    );

    if (!categoriaActualizada) {
      const error = new Error('Categoría no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      message: 'Categoría actualizada correctamente',
      data: categoriaActualizada
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/categories/:id - Eliminar categoría
export const eliminarCategoria = async (req, res, next) => {
  try {
    const { id } = req.params;

    const categoriaEliminada = await CategoryModel.findByIdAndDelete(id);

    if (!categoriaEliminada) {
      const error = new Error('Categoría no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      message: 'Categoría eliminada correctamente'
    });
  } catch (error) {
    next(error);
  }
};
