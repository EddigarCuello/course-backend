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
import { authRequired, adminRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/')
  .get(obtenerCursos)
  .post(authRequired, adminRequired, crearCurso);

router.post('/bulk', authRequired, adminRequired, crearCursosMasivo);

router.route('/activos/')
  .get(obtenerCursosActivos);

router.route('/:id')
  .get(obtenerCursoPorId)
  .put(authRequired, adminRequired, actualizarCurso)
  .delete(authRequired, adminRequired, eliminarCurso);

export default router;