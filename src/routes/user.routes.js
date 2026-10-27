import { Router } from 'express';

import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  registrarUsuario,
  actualizarUsuario,
  eliminarUsuario
} from '../controllers/user.controller.js';
import { authRequired, adminRequired } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas para la raíz: /api/users
router.route('/')
  .get(authRequired, adminRequired, obtenerUsuarios)      // GET /api/users -> Listar todos (solo admin)
  .post(registrarUsuario);                                // POST /api/users -> Registro público de usuario

// Rutas con parámetro ID: /api/users/:id
router.route('/:id')
  .get(authRequired, obtenerUsuarioPorId)                 // GET /api/users/:id -> Obtener por ID
  .put(authRequired, actualizarUsuario)                   // PUT /api/users/:id -> Actualizar perfil
  .delete(authRequired, adminRequired, eliminarUsuario);  // DELETE /api/users/:id -> Eliminar usuario (solo admin)

export default router;