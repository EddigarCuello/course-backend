import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { createId } from '../db/helpers.js';

export const createAdmin = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios para crear el administrador');
  }
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await query('SELECT id,rol FROM users WHERE email=$1', [email]);
  if (existing.rowCount) {
    if (existing.rows[0].rol !== 'admin') {
      throw new Error(`El correo ${email} ya está registrado con otro rol`);
    }
    console.log(`El administrador ${email} ya existe; no se modificó`);
    return;
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await query(
    `INSERT INTO users (id,nombre,email,password_hash,rol) VALUES ($1,$2,$3,$4,'admin')`,
    [createId(), 'Administrador', email, passwordHash]
  );
  console.log(`Administrador ${email} creado`);
};
