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

const router = Router();

// Rutas para la raíz: /api/teachers
router.route('/')
  .get(obtenerTodosProfesores)
  .post(registrarProfesor);

router.route('/bulk')
  .post(registrarProfesoresMasivo);

router.route('/activos')
 .get(obtenerProfesores);

// Rutas con parámetro ID: /api/users/:id
router.route('/:id')
  .get(obtenerProfesorPorId)  // GET /api/users/:id -> Obtener por ID
  .put(actualizarProfesor)    // PUT /api/users/:id -> Actualizar perfil
  .delete(eliminarProfesor);  // DELETE /api/users/:id -> Eliminar usuario

export default router;