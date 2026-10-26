import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDB, query } from '../config/db.js';

const directory = path.dirname(fileURLToPath(import.meta.url));

try {
  const schema = await fs.readFile(path.join(directory, 'schema.sql'), 'utf8');
  await query(schema);
  console.log('Esquema PostgreSQL aplicado correctamente');
} catch (error) {
  console.error('No se pudo aplicar el esquema PostgreSQL:', error);
  process.exitCode = 1;
} finally {
  await closeDB();
}
