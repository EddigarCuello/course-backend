import { Router } from 'express';
import { createCheckoutSession, verifyCheckoutSession, getMyPayments, registerCashEnrollment, getAllPayments, updatePaymentStatus, uploadReceipt } from '../controllers/payment.controller.js';
import { authRequired, adminRequired } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

// POST /api/payments/create-checkout-session
// Protegida: requiere token JWT válido
router.post('/create-checkout-session', authRequired, createCheckoutSession);

// POST /api/payments/verify-session
// Protegida: requiere token JWT válido
router.post('/verify-session', authRequired, verifyCheckoutSession);

// GET /api/payments/me
// Protegida: requiere token JWT válido
router.get('/me', authRequired, getMyPayments);

// POST /api/payments/register-cash
// Inscripción por efectivo/transferencia (queda en pending)
router.post('/register-cash', authRequired, registerCashEnrollment);

// POST /api/payments/:paymentId/receipt
// Sube el comprobante de pago
router.post('/:paymentId/receipt', authRequired, upload.single('receipt'), uploadReceipt);

// --- RUTAS DE ADMINISTRADOR ---

// GET /api/payments/admin/all
// Protegida: requiere token JWT válido y rol admin
router.get('/admin/all', authRequired, adminRequired, getAllPayments);

// PUT /api/payments/admin/:paymentId/status
// Protegida: requiere token JWT válido y rol admin
router.put('/admin/:paymentId/status', authRequired, adminRequired, updatePaymentStatus);

export default router;
