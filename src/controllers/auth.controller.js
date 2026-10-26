import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { createId, toError, userSelect } from '../db/helpers.js';

const requireJwtSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET es obligatorio');
  return process.env.JWT_SECRET;
};

export const register = async (req, res, next) => {
  try {
    const { nombre, email, password, telefono, pais, ciudad } = req.body;
    if (!nombre || !email || !password) return next(toError('Nombre, email y contraseña son obligatorios'));

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await query('SELECT 1 FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rowCount) return next(toError('Correo electrónico ya registrado', 409));

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (id, nombre, email, password_hash, telefono, pais, ciudad, rol)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'estudiante') RETURNING ${userSelect}`,
      [createId(), nombre.trim(), normalizedEmail, passwordHash, telefono || '', pais || '', ciudad || '']
    );
    const user = result.rows[0];
    delete user.passwordHash;
    res.status(201).json({ ok: true, message: 'Usuario registrado con éxito', data: user });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return next(toError('Email y contraseña son obligatorios'));

    const result = await query(
      `SELECT ${userSelect} FROM users WHERE email = $1 AND eliminado = false`,
      [String(email).trim().toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return next(toError('Credenciales incorrectas', 401));
    }

    await query('UPDATE users SET ultimo_login = now(), updated_at = now() WHERE id = $1', [user.id]);
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      requireJwtSecret(),
      { expiresIn: '7d' }
    );
    delete user.passwordHash;
    res.status(200).json({ ok: true, message: 'Inicio de sesión exitoso', token, data: user });
  } catch (error) {
    next(error);
  }
};
