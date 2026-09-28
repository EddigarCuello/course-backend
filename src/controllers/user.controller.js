import { UserModel } from '../models/user.schema.js'; // O '../models/user.schema.js' según nombraste el archivo
import mongoose from 'mongoose';

// GET /api/users
export const obtenerUsuarios = async (req, res, next) => {
  try {
    // Obtenemos únicamente usuarios activos/no eliminados
    const usuarios = await UserModel.find({ eliminado: false }).select('-passwordHash');

    res.status(200).json({
      ok: true,
      data: usuarios
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:idOrEmail
export const obtenerUsuarioPorId = async (req, res, next) => {
  try {
    const { id } = req.params; // Viene como /:id en la ruta

    // 1. Construir el query base
    let query = { eliminado: false };

    // 2. Validar si el parámetro enviado es un ID válido de MongoDB
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      // Si no es un ObjectId válido, asumimos que intenta buscar por correo
      query.email = id.toLowerCase();
    }

    // 3. Ejecutar la búsqueda
    const usuario = await UserModel.findOne(query).select('-passwordHash');

    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      data: usuario
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users
export const registrarUsuario = async (req, res, next) => {
  try {
    const {
      nombre,
      email,
      password,
      telefono,
      pais,
      ciudad,
      rol,
      avatarUrl,
      bio,
      idiomaPreferido,
      detallesInstructor
    } = req.body;

    // Validar campos obligatorios
    if (!nombre || !email || !password) {
      const error = new Error(
        'Nombre, email y contraseña son obligatorios'
      );
      error.statusCode = 400;
      return next(error);
    }

    // Comprobar si el email ya existe
    const usuarioExistente = await UserModel.findOne({ email });

    if (usuarioExistente) {
      const error = new Error(
        'El correo electrónico ya está registrado'
      );
      error.statusCode = 400;
      return next(error);
    }

    // Crear usuario
    const nuevoUsuario = await UserModel.create({
      nombre,
      email,
      passwordHash: password, // TODO: reemplazar por hash con bcrypt
      telefono,
      pais,
      ciudad,
      rol,
      avatarUrl,
      bio,
      idiomaPreferido,

      // Solo tendrá información si el usuario es instructor
      detallesInstructor:
        rol === 'instructor'
          ? detallesInstructor
          : undefined
    });

    // Convertir a objeto para eliminar información sensible
    const usuarioRespuesta = nuevoUsuario.toObject();
    delete usuarioRespuesta.passwordHash;

    res.status(201).json({
      ok: true,
      message: 'Usuario registrado con éxito',
      data: usuarioRespuesta
    });

  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id
export const actualizarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      telefono,
      pais,
      ciudad,
      rol,
      activo,
      avatarUrl,
      bio,
      idiomaPreferido,
      detallesInstructor
    } = req.body;

    // Construimos el objeto de actualización de forma dinámica
    const camposAActualizar = {
      ...(nombre && { nombre }),
      ...(telefono !== undefined && { telefono }),
      ...(pais !== undefined && { pais }),
      ...(ciudad !== undefined && { ciudad }),
      ...(rol && { rol }),
      ...(activo !== undefined && { activo }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(bio !== undefined && { bio }),
      ...(idiomaPreferido && { idiomaPreferido })
    };

    // Manejar detalles de instructor si se actualiza a rol instructor o si ya lo es
    if (rol === 'instructor' && detallesInstructor) {
      camposAActualizar.detallesInstructor = detallesInstructor;
    }

    const usuarioActualizado = await UserModel.findOneAndUpdate(
      { _id: id, eliminado: false },
      camposAActualizar,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!usuarioActualizado) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      message: 'Usuario actualizado correctamente',
      data: usuarioActualizado
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id (Borrado Lógico)
export const eliminarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Se realiza un borrado lógico marcando 'eliminado: true' y desactivándolo
    const usuarioEliminado = await UserModel.findOneAndUpdate(
      { _id: id, eliminado: false },
      { eliminado: true, activo: false },
      { new: true }
    );

    if (!usuarioEliminado) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      message: 'Usuario eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};