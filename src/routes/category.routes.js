import { Router } from 'express';
import {
  obtenerCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  crearCategoriasMasivo,
  actualizarCategoria,
  eliminarCategoria
} from '../controllers/category.controller.js';

const router = Router();

router.route('/')
  .get(obtenerCategorias)
  .post(crearCategoria);

router.post('/bulk', crearCategoriasMasivo);

router.route('/:id')
  .get(obtenerCategoriaPorId)
  .put(actualizarCategoria)
  .delete(eliminarCategoria);

export default router;
