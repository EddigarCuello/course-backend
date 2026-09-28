import { UserModel } from "../models/user.schema.js";
import jwt from 'jsonwebtoken';

// POST /api/auth/register
export const register = async(req , res , next)=>{

    try{
        const {
            nombre,
            email, 
            password, 
            rol, 
            telefono, 
            pais, 
            ciudad
        } = req.body
        
        //Campos Obligatorios
        if(!nombre || !email || !password){
            const error = new Error('Nombre, Email y Constraseña son obligatorios');
            error.statusCode = 400;
            return next(error);

        }

        //Existe el correo?
        const usuariosExistente = await UserModel.findOne({email});
        if(usuariosExistente){
            const error = new Error('Correo electronico ya registrado');
            error.statusCode = 400;
            return next(error);

        }

        //Crear el usuario
        const nuevoUsuarios = await UserModel.create({
            nombre,
            email,
            passwordHash: password,
            rol,
            telefono,
            pais,
            ciudad
        });

        //ocultamos la contrañesa para enviar una 
        //respuesta.
        const respuesta = nuevoUsuarios.toObject();
        delete respuesta.passwordHash;


        //devolvemos una respuesta
        res.status(201).json({
            ok : true,
            message: 'Usuario registrado con exito',
            data: respuesta
        });

    //manejo de errores
    }catch(error){
        next(error);
    }

};



// POST /api/auth/login
export const login = async(req, res, next) => {
    try {
        //recibimos los datos del req.body
        const {
            email,
            password
        } = req.body


        //verificar los datos recibidos
        if(!email || !password){
            const error = new Error('email y contraseña obligatorios');
            error.statusCode = 400;
            return next(error);
        }

        //buscar que exista el usuario y que no este eliminado
        const usuario = await UserModel.findOne({email: email?.toLowerCase().trim(), eliminado: false});
        if(!usuario){
            console.log(`[LOGIN INVASIVO] Usuario NO encontrado en BD: ${email}`);
            const error = new Error('credenciales incorrectas');
            error.statusCode = 401;
            return next(error);
        }

        //usamos el metodo de instancia para verificar la password
        const esPasswordValido = await usuario.compararPassword(password);
        if(!esPasswordValido) {
            console.log(`[LOGIN INVASIVO] Contraseña invalida para el usuario: ${email}`);
            const error = Error('credenciales incorrectas');
            error.statusCode = 401;
            return next(error);
        }

        //actualizar la ultima fecha de login
        usuario.ultimoLogin = new Date();
        await usuario.save({validateBeforeSave: false});

        //ocultar contraseña de la respuesta
        const respuesta = usuario.toObject();
        delete respuesta.passwordHash;

        // Generar JWT
        const token = jwt.sign(
          { id: usuario._id, email: usuario.email, rol: usuario.rol },
          process.env.JWT_SECRET || 'secret_dev',
          { expiresIn: '7d' }
        );

        //enviar respuesta
        res.status(200).json({
            ok: true,
            message: 'Inicio de sesion exitoso',
            token,
            data: respuesta
        });
    //manejo de errores
    } catch (error) {
        next(error);
    }
}