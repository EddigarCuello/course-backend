import { Router } from 'express';
import {
  obtenerCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  crearCategoriasMasivo,
  actualizarCategoria,
  eliminarCategoria
} from '../controllers/category.controller.js';
import { authRequired, adminRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/')
  .get(obtenerCategorias)
  .post(authRequired, adminRequired, crearCategoria);

router.post('/bulk', authRequired, adminRequired, crearCategoriasMasivo);

router.route('/:id')
  .get(obtenerCategoriaPorId)
  .put(authRequired, adminRequired, actualizarCategoria)
  .delete(authRequired, adminRequired, eliminarCategoria);

export default router;
