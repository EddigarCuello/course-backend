import { Router } from 'express';
import { 
    obtenerCursoPorId,
    obtenerCursos,
    crearCurso,
    crearCursosMasivo,
    eliminarCurso,
    actualizarCurso,
    obtenerCursosActivos
} from '../controllers/course.controller.js';

const router = Router();

router.route('/')
  .get(obtenerCursos)
  .post(crearCurso);

router.post('/bulk', crearCursosMasivo);

router.route('/activos/')
  .get(obtenerCursosActivos);

router.route('/:id')
  .get(obtenerCursoPorId)
  .put(actualizarCurso)
  .delete(eliminarCurso);

export default router;