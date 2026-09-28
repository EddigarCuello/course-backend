import { Schema, model } from 'mongoose';

const reviewSchema = new Schema(
  {
    curso: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },

    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    calificacion: {
      type: Number,
      required: true,
      min: [1, 'La calificación mínima es 1'],
      max: [5, 'La calificación máxima es 5']
    },

    comentario: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Un usuario solo puede dejar una reseña por curso
reviewSchema.index(
  { curso: 1, usuario: 1 },
  { unique: true }
);

export const ReviewModel = model('Review', reviewSchema);