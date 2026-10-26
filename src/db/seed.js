import 'dotenv/config';
import { closeDB } from '../config/db.js';
import { seedDatabase } from '../config/seed.js';

try {
  await seedDatabase();
  console.log('Datos de demostración cargados');
} catch (error) {
  console.error('No se pudo cargar la semilla de datos:', error);
  process.exitCode = 1;
} finally {
  await closeDB();
}
