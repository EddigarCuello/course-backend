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
import { query } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Confía en el Application Load Balancer (ALB) para cabeceras X-Forwarded-*
app.set('trust proxy', 1);

// Servir la carpeta uploads como estática (desarrollo local)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logger simple de solicitudes
app.use((req,res,next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

//Middlewares globales
app.use(express.json());

// CORS configurable para producción y desarrollo
app.use((req, res, next) => {
  const allowedOrigin = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : '*';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
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

// Health checks para AWS Application Load Balancer (ALB) y Target Groups
app.get(['/health', '/api/health'], async (req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check falló al consultar PostgreSQL:', error);
    res.status(503).json({ status: 'unhealthy', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

//Manejador de rutas no encontradas (404)
app.use(notFoundHandler);

//Manejador global de errores (Debe ser la ÚLTIMA línea de app.use)
app.use(errorHandler);

export default app;