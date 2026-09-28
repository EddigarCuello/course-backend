import { Schema, model } from 'mongoose';

const enrollmentSchema = new Schema(
  {
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    curso: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },

    estadoPago: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },

    pagoId: {
      type: String,
      default: null
    },

    montoPagado: {
      type: Number,
      default: null,
      min: 0
    },

    estadoCompletado: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started'
    },

    certificadoUrl: {
      type: String,
      default: null
    },

    notaFinal: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },

    fechaInscripcion: {
      type: Date,
      default: Date.now
    },

    fechaPago: {
      type: Date,
      default: null
    },

    fechaCompletado: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Evita que un usuario se inscriba dos veces
enrollmentSchema.index(
  { usuario: 1, curso: 1 },
  { unique: true }
);

export const EnrollmentModel = model(
  'Enrollment',
  enrollmentSchema
);