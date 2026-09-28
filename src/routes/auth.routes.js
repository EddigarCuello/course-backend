
import { Router } from 'express';

import { register,login 
  
} from '../controllers/auth.controller.js';

const router = Router();

router.route('/register')
  .post(register);           // POST /api/users/register -> registra usuarios

router.route('/login')
  .post(login);             //POST /api/users/login -> Inicio de seasion para usuarios

export default router;