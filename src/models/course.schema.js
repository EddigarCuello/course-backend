import { Schema, model } from 'mongoose';

const courseSchema = new Schema(
  {
    titulo: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true
    },

    descripcion: {
      type: String,
      default: ''
    },

    categoria: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },

    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'teacher',
      required: true
    },

    precio: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'El precio no puede ser negativo']
    },

    capacidad: {
      type: Number,
      required: true,
      default: 20,
      min: [1, 'La capacidad debe ser mayor que 0']
    },

    inscritos: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Los inscritos no pueden ser negativos']
    },

    fechaInicio: {
      type: Date,
      required: true
    },

    fechaFin: {
      type: Date,
      required: true
    },

    horaInicio: {
      type: String,
      required: true
    },

    horaFin: {
      type: String,
      required: true
    },

    diasSemana: {
      type: [String],
      required: true
    },

    horario: {
      type: String,
      default: ''
    },

    zonaHoraria: {
      type: String,
      default: 'UTC'
    },

    ubicacion: {
      type: String,
      default: 'Online'
    },

    numeroAula: {
      type: String,
      default: null
    },

    estado: {
      type: String,
      enum: ['draft', 'published', 'finished'],
      default: 'draft'
    },

    publicado: {
      type: Boolean,
      default: false
    },

    thumbnailUrl: {
      type: String,
      default: null
    },

    nivel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner'
    },

    maxEstudiantesSesion: {
      type: Number,
      default: null,
      min: 1
    },

    requisitos: {
      type: String,
      default: ''
    },

    fechaPublicacion: {
      type: Date,
      default: null
    },

    eliminado: {
      type: Boolean,
      default: false
    },

    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const CourseModel = model('Course', courseSchema);