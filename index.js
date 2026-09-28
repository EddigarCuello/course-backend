import 'dotenv/config'; // Carga las variables del .env
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { createAdmin } from './src/config/create.admin.js';
import { seedDatabase } from './src/config/seed.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  //Conectar a MongoDB en Docker
  await connectDB();

  //crear la cuenta de admin si no existe
  await createAdmin();

  // Sembrar catálogo de cursos, categorías y profesores si la BD está vacía
  await seedDatabase();

  //Levantar el servidor de Express
  app.listen(PORT, () => {
    console.log(` Servidor corriendo en http://localhost:${PORT}`);
  });
};

startServer();