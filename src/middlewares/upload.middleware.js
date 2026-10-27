import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isS3Configured } from '../services/s3.service.js';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Aceptar imágenes y PDFs
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no soportado. Sube solo imágenes o PDFs.'), false);
  }
};

export const upload = multer({
  // Si S3 está configurado, almacena en memoria para subir directamente a S3 sin tocar disco.
  // En local sin S3, usa almacenamiento en disco en ./uploads.
  storage: isS3Configured() ? multer.memoryStorage() : diskStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: fileFilter
});

