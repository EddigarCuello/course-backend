import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/auth.routes.js'
import courseRoutes from './routes/course.routes.js'
import teacherRoutes from './routes/teacher.routes.js';
import categoryRoutes from './routes/category.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { errorHandler,notFoundHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Servir la carpeta uploads como estática
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

//
app.use((req,res,next) => {
  console.log(`metodo de la peticion: ${req.method}\nurl de la peticion: ${req.url}`);
  next();
});

//Middlewares globales
app.use(express.json());

// CORS manual para permitir frontend Prime (sin dependencia extra)
// En producción restringe origin a tu dominio
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

//Rutas de la API
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'API REST E-commerce Cursos activa' });
});

//Manejador de rutas no encontradas (404)
app.use(notFoundHandler);

//Manejador global de errores (Debe ser la ÚLTIMA línea de app.use)
app.use(errorHandler);

export default app;