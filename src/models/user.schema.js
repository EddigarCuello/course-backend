import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema(
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

    passwordHash: {
      type: String,
      required: [true, 'La contraseña es obligatoria']
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

    rol: {
      type: String,
      enum: {
        values: ['estudiante', 'admin', 'instructor'],
        message: '{VALUE} no es un rol válido'
      },
      default: 'estudiante'
    },

    activo: {
      type: Boolean,
      default: true
    },

    eliminado: {
      type: Boolean,
      default: false
    },

    avatarUrl: {
      type: String,
      default: null
    },

    bio: {
      type: String,
      default: ''
    },

    idiomaPreferido: {
      type: String,
      default: 'es'
    },

    ultimoLogin: {
      type: Date,
      default: null
    },
  },
  {
    timestamps: true,
    versionKey: false
  }
);


//hook: pre-save(antes de guardar)
//se ejecuta antes de .create() o .save()
userSchema.pre('save', async function () {

  //verifica en caliente al momento
  //si la contraseña cambio para evitar volver a encriptar
  if (!this.isModified('passwordHash')) return;

  //generamos el salt para que 2 hash no sean iguales
  //y encriptamos
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash,salt);

});


//metodo de instancia: osea meotdo apra cada documento/objeto individual
//creado con el schema de mongoose.

//compara el texto plano ingresado con el hash de la db
userSchema.methods.compararPassword = async function (passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.passwordHash);
}


export const UserModel = model('User', userSchema);