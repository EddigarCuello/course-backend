import 'dotenv/config'; // Carga las variables del .env
import app from './src/app.js';
import { closeDB, connectDB } from './src/config/db.js';

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET es obligatorio antes de iniciar la API');
  }
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(` Servidor corriendo en http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer().catch((error) => {
  console.error('No se pudo iniciar la API:', error);
  process.exit(1);
});