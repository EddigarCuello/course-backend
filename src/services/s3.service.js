import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

const bucketName = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '';
const region = process.env.AWS_REGION || 'us-east-1';

let s3Client = null;

export const isS3Configured = () => Boolean(bucketName);

export const getS3Client = () => {
  if (!s3Client && isS3Configured()) {
    const clientConfig = { region };
    // Si se proporcionan llaves explícitas (desarrollo local), se usan;
    // en EC2 en producción, S3Client toma automáticamente el IAM Role de la instancia vía IMDSv2.
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
    }
    s3Client = new S3Client(clientConfig);
  }
  return s3Client;
};

/**
 * Sube un archivo a Amazon S3
 * @param {Object} params
 * @param {Buffer} params.buffer
 * @param {string} params.originalname
 * @param {string} params.mimetype
 * @param {string} [params.folder='receipts']
 * @returns {Promise<{ url: string, key: string, bucket: string }>}
 */
export const uploadFileToS3 = async ({ buffer, originalname, mimetype, folder = 'receipts' }) => {
  if (!isS3Configured()) {
    throw new Error('S3_BUCKET_NAME no está configurado en las variables de entorno');
  }

  const client = getS3Client();
  const ext = path.extname(originalname);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const key = `${folder}/${uniqueSuffix}${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimetype
  });

  await client.send(command);

  const publicUrl = process.env.CLOUDFRONT_URL
    ? `${process.env.CLOUDFRONT_URL.replace(/\/$/, '')}/${key}`
    : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

  return {
    url: publicUrl,
    key,
    bucket: bucketName
  };
};
