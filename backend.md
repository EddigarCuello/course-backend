# Course-Ecommerce (Backend)

API REST para una plataforma e-commerce de cursos online. Implementada con Node.js, Express, MongoDB y Docker.

---

## Tecnologías y Stack

- **Runtime:** Node.js (ES Modules - `"type": "module"`)
- **Framework Web:** Express.js
- **Base de Datos:** MongoDB 6.0
- **ODM:** Mongoose
- **Infraestructura:** Docker y Docker Compose
- **Pruebas:** Thunder Client (VS Code)

---

## Estructura del Proyecto

```text
backend/
├── src/
│   ├── config/
│   │   └── db.js                 # Conexión asíncrona a MongoDB con Mongoose
│   ├── controllers/
│   │   └── user.controller.js    # Lógica de negocio HTTP y operaciones CRUD
│   ├── middlewares/
│   │   └── errorHandler.js       # Manejo centralizado de errores y rutas no encontradas
│   ├── models/
│   │   └── user.model.js         # Esquema de Mongoose (User Schema)
│   ├── routes/
│   │   └── user.routes.js        # Definición de endpoints mediante Express Router
│   └── app.js                    # Configuración de Express, middlewares y rutas
├── .env                          # Variables de entorno
├── docker-compose.yml            # Orquestación del contenedor de MongoDB
├── index.js                      # Punto de entrada, conexión a DB e inicio del servidor
├── package.json                  # Scripts y dependencias del proyecto
└── README.md                     # Documentación del proyecto
```

---

## Configuración del Entorno y Ejecución

### 1. Variables de Entorno

En la raíz de la carpeta `backend`, crea un archivo `.env`:

```env
PORT=3000
MONGO_URI=mongodb://admin:pswrd@localhost:27017/course_ecommerce_db?authSource=admin
```

### 2. Base de Datos en Docker

Para iniciar el contenedor de MongoDB definido en `docker-compose.yml`:

```bash
docker compose up -d
```

### 3. Arranque del Servidor

Instalar las dependencias:

```bash
npm install
```

Levantar la API en modo desarrollo con Nodemon:

```bash
npm run dev
```

---

## Documentación de Endpoints

**Base URL:** `http://localhost:3000/api/users`

| Método | Endpoint | Descripción | Body (JSON) | Respuesta Exitosa |
|---|---|---|---|---|
| **GET** | `/` | Listar todos los usuarios | N/A | `200 OK` |
| **GET** | `/:id` | Obtener un usuario por ID | N/A | `200 OK` |
| **POST** | `/` | Registrar un nuevo usuario | `{ "nombre": "...", "email": "...", "password": "...", "rol": "..." }` | `201 Created` |
| **PUT** | `/:id` | Actualizar perfil de usuario | `{ "nombre": "...", "rol": "..." }` | `200 OK` |
| **DELETE** | `/:id` | Eliminar un usuario | N/A | `204 No Content` |

---

## Arquitectura

El backend utiliza una arquitectura MVC desacoplada:

```text
Cliente
   |
   v
Routes
   |
   v
Controllers
   |
   v
Models
   |
   v
MongoDB
```

Los middlewares se encargan de funcionalidades transversales como el procesamiento de JSON y el manejo centralizado de errores.
