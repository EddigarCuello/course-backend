import { UserModel } from "../models/user.schema.js";

export const createAdmin = async () => {
    try {
        // Borramos usuarios admin previos para asegurar estado limpio y evitar contraseñas corruptas
        await UserModel.deleteMany({ rol: 'admin' });

        const adminUser = new UserModel({
            nombre: 'ADMIN',
            email: 'admin@gmail.com',
            passwordHash: 'AdminPassword123',
            rol: 'admin',
            avatarUrl: "https://imgcdn.stablediffusionweb.com/2024/9/8/2ee8c87f-e8e4-4f2a-a475-3dac6fa8feb9.jpg"
        });

        await adminUser.save();
        console.log(' Administrador recreado exitosamente: admin@gmail.com / AdminPassword123');
    } catch (error) {
        console.log('Error al crear o verificar Admin: ', error);
    }
};

