import pg from 'pg';
import fs from 'node:fs';

const { Pool } = pg;
const sslCaPath = process.env.DB_SSL_CA?.trim();
const sslCa = sslCaPath ? fs.readFileSync(sslCaPath, 'utf8') : undefined;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL es obligatorio para conectarse a PostgreSQL');
}

const isRDS = process.env.DATABASE_URL.includes('rds.amazonaws.com');
const useSSL = process.env.DB_SSL === 'true' || isRDS;

const sslConfig = useSSL
  ? (sslCa ? { rejectUnauthorized: true, ca: sslCa } : { rejectUnauthorized: false })
  : undefined;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: sslConfig
});

export const connectDB = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL conectado');
  } catch (error) {
    if (error.code === '3D000') {
      try {
        const parsed = new URL(process.env.DATABASE_URL);
        const targetDb = parsed.pathname.replace(/^\//, '');
        parsed.pathname = '/postgres';

        console.log(`Base de datos '${targetDb}' no existe. Creándola desde la base de datos 'postgres'...`);
        const adminPool = new Pool({
          connectionString: parsed.toString(),
          ssl: sslConfig
        });
        await adminPool.query(`CREATE DATABASE "${targetDb}"`);
        await adminPool.end();
        console.log(`Base de datos '${targetDb}' creada exitosamente.`);
        await pool.query('SELECT 1');
        console.log('PostgreSQL conectado tras inicialización');
        return;
      } catch (adminErr) {
        console.error('Error al intentar crear automáticamente la base de datos:', adminErr);
      }
    }
    throw error;
  }
};

export const query = (text, values) => pool.query(text, values);

export const closeDB = () => pool.end();
