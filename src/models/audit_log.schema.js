import { Schema, model } from 'mongoose';

const auditLogSchema = new Schema(
  {
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    coleccion: {
      type: String,
      required: true
    },

    operacion: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE'],
      required: true
    },

    documentoId: {
      type: Schema.Types.ObjectId,
      required: true
    },

    valoresAnteriores: {
      type: Schema.Types.Mixed,
      default: null
    },

    valoresNuevos: {
      type: Schema.Types.Mixed,
      default: null
    },

    motivoCambio: {
      type: String,
      default: null
    },

    direccionIp: {
      type: String,
      default: null
    },

    userAgent: {
      type: String,
      default: null
    }
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false
    },
    versionKey: false
  }
);

export const AuditLogModel = model(
  'AuditLog',
  auditLogSchema
);