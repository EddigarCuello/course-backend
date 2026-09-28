import { teacherModel } from '../models/teacher_data.schema.js';
import mongoose from 'mongoose';

// GET /api/teachers (Solo profesores activos)
export const obtenerProfesores = async (req, res, next) => {
  try {
    const profesores = await teacherModel.find({ activo: true }).select('-passwordHash');

    res.status(200).json({
      ok: true,
      total: profesores.length,
      data: profesores
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/teachers/all (Todos los profesores, activos e inactivos)
export const obtenerTodosProfesores = async (req, res, next) => {
  try {
    const profesores = await teacherModel.find().select('-passwordHash');

    res.status(200).json({
      ok: true,
      total: profesores.length,
      data: profesores
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/teachers/:idOrEmail
export const obtenerProfesorPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query = {};

    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.email = id.toLowerCase();
    }

    const profesor = await teacherModel.findOne(query).select('-passwordHash');

    if (!profesor) {
      const error = new Error('Docente no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      data: profesor
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/teachers
export const registrarProfesor = async (req, res, next) => {
  try {
    const {
      nombre,
      email,
      telefono,
      pais,
      ciudad,
      avatarUrl,
      detallesInstructor
    } = req.body;

    // 1. Validar campos obligatorios
    if (!nombre || !email) {
      const error = new Error('Nombre y email son obligatorios');
      error.statusCode = 400;
      return next(error);
    }

    // 2. Comprobar si el email ya existe
    const profesorExistente = await teacherModel.findOne({ email: email.toLowerCase() });
    if (profesorExistente) {
      const error = new Error('El correo electrónico ya está registrado');
      error.statusCode = 400;
      return next(error);
    }

    // 3. Crear el profesor
    const nuevoProfesor = await teacherModel.create({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      telefono: telefono || '',
      pais: pais || '',
      ciudad: ciudad || '',
      avatarUrl: avatarUrl || null,
      detallesInstructor: detallesInstructor || { especializacion: '', departamento: '' }
    });

    res.status(201).json({
      ok: true,
      message: 'Profesor registrado con éxito',
      data: nuevoProfesor
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/teachers/bulk
export const registrarProfesoresMasivo = async (req, res, next) => {
  try {
    const lista = Array.isArray(req.body) ? req.body : req.body.teachers;
    if (!Array.isArray(lista) || lista.length === 0) {
      const error = new Error('Se requiere una lista no vacía de profesores');
      error.statusCode = 400;
      return next(error);
    }

    const creados = [];
    const omitidos = [];
    const errores = [];

    for (const item of lista) {
      const nombre = (item.nombre || item.Nombre || item.name || '').toString().trim();
      const email = (item.email || item.Email || item.correo || '').toString().trim().toLowerCase();
      const telefono = (item.telefono || item.Telefono || item.phone || '').toString().trim();
      const pais = (item.pais || item.Pais || item.country || '').toString().trim();
      const ciudad = (item.ciudad || item.Ciudad || item.city || '').toString().trim();
      const especializacion = (item.especializacion || item.Especializacion || item.detallesInstructor?.especializacion || '').toString().trim();
      const departamento = (item.departamento || item.Departamento || item.detallesInstructor?.departamento || '').toString().trim();

      if (!nombre || !email) {
        errores.push({ item, motivo: 'Nombre y email son requeridos' });
        continue;
      }

      const existe = await teacherModel.findOne({ email });
      if (existe) {
        omitidos.push({ email, motivo: 'El correo electrónico ya existe' });
        continue;
      }

      const nuevoProfesor = await teacherModel.create({
        nombre,
        email,
        telefono,
        pais,
        ciudad,
        avatarUrl: item.avatarUrl || null,
        detallesInstructor: {
          especializacion,
          departamento
        }
      });
      creados.push(nuevoProfesor);
    }

    res.status(201).json({
      ok: true,
      message: `Procesamiento masivo completado. ${creados.length} creados, ${omitidos.length} omitidos, ${errores.length} errores.`,
      creados,
      omitidos,
      errores
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/teachers/:id
export const actualizarProfesor = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('El ID enviado no es válido');
      error.statusCode = 400;
      return next(error);
    }

    const {
      nombre,
      telefono,
      pais,
      ciudad,
      activo,
      avatarUrl,
      detallesInstructor
    } = req.body;

    // Construcción dinámica alineada a tu teacherSchema
    const camposAActualizar = {
      ...(nombre && { nombre }),
      ...(telefono !== undefined && { telefono }),
      ...(pais !== undefined && { pais }),
      ...(ciudad !== undefined && { ciudad }),
      ...(activo !== undefined && { activo }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(detallesInstructor && { detallesInstructor })
    };

    const profesorActualizado = await teacherModel.findByIdAndUpdate(
      id,
      camposAActualizar,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!profesorActualizado) {
      const error = new Error('Profesor no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      message: 'Profesor actualizado correctamente',
      data: profesorActualizado
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/teachers/:id
export const eliminarProfesor = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('El ID enviado no es válido');
      error.statusCode = 400;
      return next(error);
    }

    // Como teacherSchema NO tiene campo 'eliminado', usamos borrado físico o desactivación
    const profesorEliminado = await teacherModel.findByIdAndDelete(id);

    if (!profesorEliminado) {
      const error = new Error('Profesor no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      message: 'Profesor eliminado correctamente de la base de datos'
    });
  } catch (error) {
    next(error);
  }
};