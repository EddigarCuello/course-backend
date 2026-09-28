import { Schema, model } from 'mongoose';

const teacherSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres']
    },

    email: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Por favor ingresa un correo electrónico válido'
      ]
    },

    telefono: {
      type: String,
      trim: true,
      default: ''
    },

    pais: {
      type: String,
      trim: true,
      default: ''
    },

    ciudad: {
      type: String,
      trim: true,
      default: ''
    },

    activo: {
      type: Boolean,
      default: true
    },

    avatarUrl: {
      type: String,
      default: null
    },


    detallesInstructor: {
      especializacion: {
        type: String,
        default: ''
      },
      departamento: {
        type: String,
        default: ''
      }
      
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);


export const teacherModel = model('teacher', teacherSchema);