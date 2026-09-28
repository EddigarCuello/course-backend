import { CourseModel } from '../models/course.schema.js';
import { CategoryModel } from '../models/category.schema.js';
import { UserModel } from '../models/user.schema.js';
import mongoose from 'mongoose';

// GET /api/courses - Obtener todos los cursos no eliminados
export const obtenerCursos = async (req, res, next) => {
  try {
    const cursos = await CourseModel.find({ eliminado: false })
      .populate('categoria', 'nombre') // Reemplaza ID por datos de la categoría
      .populate('instructor', 'nombre email avatarUrl'); // Reemplaza ID por datos del instructor

    res.status(200).json({
      ok: true,
      total: cursos.length,
      data: cursos
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/courses/activos - Obtener todos los cursos activos
export const obtenerCursosActivos = async (req, res, next) => {
  try {
    const cursos = await CourseModel.find({ activo: true, eliminado: false })
      .populate('categoria', 'nombre') // Reemplaza ID por datos de la categoría
      .populate('instructor', 'nombre email avatarUrl'); // Reemplaza ID por datos del instructor

    res.status(200).json({
      ok: true,
      total: cursos.length,
      data: cursos
    });
  } catch (error) {
    next(error);
  }
};



// GET /api/courses/:id - Obtener un curso por ID
export const obtenerCursoPorId = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('El ID del curso no es válido');
      error.statusCode = 400;
      return next(error);
    }

    const curso = await CourseModel.findOne({ _id: id, eliminado: false })
      .populate('categoria', 'nombre')
      .populate('instructor', 'nombre email avatarUrl');

    if (!curso) {
      const error = new Error('Curso no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      data: curso
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/courses - Crear un nuevo curso
export const crearCurso = async (req, res, next) => {
  try {
    const {
      titulo,
      descripcion,
      categoria,
      instructor,
      precio,
      capacidad,
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      diasSemana,
      horario,
      zonaHoraria,
      ubicacion,
      numeroAula,
      estado,
      publicado,
      thumbnailUrl,
      nivel,
      maxEstudiantesSesion,
      requisitos
    } = req.body;

    // Validar campos requeridos explícitamente en tu Schema
    if (!titulo || !categoria || !instructor || !fechaInicio || !fechaFin || !horaInicio || !horaFin || !diasSemana) {
      const error = new Error('Faltan campos obligatorios para registrar el curso');
      error.statusCode = 400;
      return next(error);
    }

    const nuevoCurso = await CourseModel.create({
      titulo,
      descripcion,
      categoria,
      instructor,
      precio,
      capacidad,
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      diasSemana,
      horario,
      zonaHoraria,
      ubicacion,
      numeroAula,
      estado,
      publicado,
      thumbnailUrl,
      nivel,
      maxEstudiantesSesion,
      requisitos,
      fechaPublicacion: publicado ? new Date() : null
    });

    res.status(201).json({
      ok: true,
      message: 'Curso creado con éxito',
      data: nuevoCurso
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/courses/bulk - Carga masiva de cursos
export const crearCursosMasivo = async (req, res, next) => {
  try {
    const { teacherModel } = await import('../models/teacher_data.schema.js');
    const lista = Array.isArray(req.body) ? req.body : (req.body.cursos || req.body.courses || []);

    if (!Array.isArray(lista) || lista.length === 0) {
      const error = new Error('Se requiere una lista no vacía de cursos');
      error.statusCode = 400;
      return next(error);
    }

    const creados = [];
    const omitidos = [];
    const errores = [];

    // Pre-cargar todas las categorías e instructores para agilizar la resolución de nombres
    const allCategories = await CategoryModel.find();
    const allTeachers = await teacherModel.find();

    for (const item of lista) {
      const titulo = (item.titulo || item.Title || item.title || '').toString().trim();
      const descripcion = (item.descripcion || item.Description || item.description || '').toString().trim();
      const precio = Number(item.precio ?? item.Price ?? item.price ?? 0);
      const capacidad = Number(item.capacidad ?? item.Capacity ?? item.capacity ?? 20);

      // Resolver categoría (ID o Nombre)
      let categoriaId = item.categoria || item.categoriaId || item.category;
      if (typeof categoriaId === 'object' && categoriaId._id) categoriaId = categoriaId._id;
      if (!mongoose.Types.ObjectId.isValid(categoriaId)) {
        const catMatch = allCategories.find(c => c.nombre.toLowerCase() === String(categoriaId || item.categoryName || item.categoriaNombre || '').toLowerCase());
        categoriaId = catMatch ? catMatch._id : (allCategories[0]?._id || null);
      }

      // Resolver instructor (ID, Email o Nombre)
      let instructorId = item.instructor || item.instructorId || item.teacher;
      if (typeof instructorId === 'object' && instructorId._id) instructorId = instructorId._id;
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        const instMatch = allTeachers.find(t => t.email.toLowerCase() === String(instructorId || '').toLowerCase() || t.nombre.toLowerCase() === String(instructorId || item.instructorNombre || '').toLowerCase());
        instructorId = instMatch ? instMatch._id : (allTeachers[0]?._id || null);
      }

      if (!titulo || !categoriaId || !instructorId) {
        errores.push({ item, motivo: 'Faltan campos clave (título, categoría o instructor)' });
        continue;
      }

      let diasSemana = item.diasSemana || item.days;
      if (typeof diasSemana === 'string') diasSemana = diasSemana.split(',').map(d => d.trim());
      if (!Array.isArray(diasSemana) || diasSemana.length === 0) diasSemana = ['Lunes'];

      const fechaInicio = item.fechaInicio ? new Date(item.fechaInicio) : new Date();
      const fechaFin = item.fechaFin ? new Date(item.fechaFin) : new Date(Date.now() + 30 * 86400000);
      const horaInicio = (item.horaInicio || item.timeStart || '09:00').toString();
      const horaFin = (item.horaFin || item.timeEnd || '11:00').toString();
      const estado = item.estado || (item.publicado ? 'published' : 'draft');
      const publicado = item.publicado ?? (estado === 'published');

      const nuevoCurso = await CourseModel.create({
        titulo,
        descripcion,
        categoria: categoriaId,
        instructor: instructorId,
        precio,
        capacidad,
        fechaInicio,
        fechaFin,
        horaInicio,
        horaFin,
        diasSemana,
        estado,
        publicado,
        fechaPublicacion: publicado ? new Date() : null
      });

      creados.push(nuevoCurso);
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

// PUT /api/courses/:id - Actualizar un curso
export const actualizarCurso = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('El ID del curso no es válido');
      error.statusCode = 400;
      return next(error);
    }

    const {
      titulo,
      descripcion,
      categoria,
      instructor,
      precio,
      capacidad,
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      diasSemana,
      horario,
      zonaHoraria,
      ubicacion,
      numeroAula,
      estado,
      publicado,
      thumbnailUrl,
      nivel,
      maxEstudiantesSesion,
      requisitos
    } = req.body;

    // Construir objeto dinámico con solo las propiedades enviadas
    const camposAActualizar = {
      ...(titulo && { titulo }),
      ...(descripcion !== undefined && { descripcion }),
      ...(categoria && { categoria }),
      ...(instructor && { instructor }),
      ...(precio !== undefined && { precio }),
      ...(capacidad !== undefined && { capacidad }),
      ...(fechaInicio && { fechaInicio }),
      ...(fechaFin && { fechaFin }),
      ...(horaInicio && { horaInicio }),
      ...(horaFin && { horaFin }),
      ...(diasSemana && { diasSemana }),
      ...(horario !== undefined && { horario }),
      ...(zonaHoraria && { zonaHoraria }),
      ...(ubicacion && { ubicacion }),
      ...(numeroAula !== undefined && { numeroAula }),
      ...(estado && { estado }),
      ...(publicado !== undefined && { 
        publicado,
        fechaPublicacion: publicado ? new Date() : null 
      }),
      ...(thumbnailUrl !== undefined && { thumbnailUrl }),
      ...(nivel && { nivel }),
      ...(maxEstudiantesSesion !== undefined && { maxEstudiantesSesion }),
      ...(requisitos !== undefined && { requisitos })
    };

    const cursoActualizado = await CourseModel.findOneAndUpdate(
      { _id: id, eliminado: false },
      camposAActualizar,
      { new: true, runValidators: true }
    );

    if (!cursoActualizado) {
      const error = new Error('Curso no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      message: 'Curso actualizado correctamente',
      data: cursoActualizado
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/courses/:id - Borrado lógico
export const eliminarCurso = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('El ID del curso no es válido');
      error.statusCode = 400;
      return next(error);
    }

    const cursoEliminado = await CourseModel.findOneAndUpdate(
      { _id: id, eliminado: false },
      { eliminado: true, publicado: false, estado: 'draft' },
      { new: true }
    );

    if (!cursoEliminado) {
      const error = new Error('Curso no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      ok: true,
      message: 'Curso eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};