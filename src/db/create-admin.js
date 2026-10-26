import 'dotenv/config';
import { closeDB } from '../config/db.js';
import { createAdmin } from '../config/create.admin.js';

try {
  await createAdmin();
} catch (error) {
  console.error('No se pudo crear el administrador:', error);
  process.exitCode = 1;
} finally {
  await closeDB();
}
