import { Schema, model } from 'mongoose';

const categorySchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la categoría es obligatorio'],
      unique: true,
      trim: true
    },

    descripcion: {
      type: String,
      default: ''
    },

    icono: {
      type: String,
      default: 'BookOpen'
    },

    color: {
      type: String,
      default: '#3b82f6'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const CategoryModel = model('Category', categorySchema);