import jwt from 'jsonwebtoken';

/**
 * Middleware de autenticación JWT.
 * Lee el token del header Authorization: Bearer <token>
 * e inyecta req.user con el payload decodificado.
 */
export const authRequired = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado. Token requerido.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret_dev');
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

/**
 * Middleware para asegurar que el usuario tenga rol de administrador.
 * Debe ir después de authRequired.
 */
export const adminRequired = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
};
