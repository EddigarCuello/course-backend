import { Router } from 'express';

import { 
    obtenerProfesorPorId,
    obtenerProfesores,
    obtenerTodosProfesores,
    registrarProfesor,
    registrarProfesoresMasivo,
    actualizarProfesor,
    eliminarProfesor
 } from '../controllers/teacher.controller.js';
import { authRequired, adminRequired } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas para la raíz: /api/teachers
router.route('/')
  .get(obtenerTodosProfesores)
  .post(authRequired, adminRequired, registrarProfesor);

router.route('/bulk')
  .post(authRequired, adminRequired, registrarProfesoresMasivo);

router.route('/activos')
 .get(obtenerProfesores);

// Rutas con parámetro ID: /api/teachers/:id
router.route('/:id')
  .get(obtenerProfesorPorId)
  .put(authRequired, adminRequired, actualizarProfesor)
  .delete(authRequired, adminRequired, eliminarProfesor);

export default router;