import { Schema, model } from 'mongoose';

const paymentSchema = new Schema(
  {
    inscripcion: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true
    },

    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    stripePaymentId: {
      type: String,
      required: true,
      unique: true
    },

    stripeCustomerId: {
      type: String,
      required: true
    },

    monto: {
      type: Number,
      required: true,
      min: [0, 'El monto no puede ser negativo']
    },

    moneda: {
      type: String,
      default: 'USD'
    },

    estado: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },

    metodoPago: {
      type: String,
      default: null
    },

    ultimos4Digitos: {
      type: String,
      maxlength: 4,
      default: null
    },

    motivoFallo: {
      type: String,
      default: null
    },

    comprobanteUrl: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const PaymentModel = model('Payment', paymentSchema);