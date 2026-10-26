import pg from 'pg';
import fs from 'node:fs';

const { Pool } = pg;
const sslCaPath = process.env.DB_SSL_CA?.trim();
const sslCa = sslCaPath ? fs.readFileSync(sslCaPath, 'utf8') : undefined;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL es obligatorio para conectarse a PostgreSQL');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true, ca: sslCa || undefined }
    : undefined
});

export const connectDB = async () => {
  await pool.query('SELECT 1');
  console.log('PostgreSQL conectado');
};

export const query = (text, values) => pool.query(text, values);

export const closeDB = () => pool.end();
