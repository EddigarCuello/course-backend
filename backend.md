# Backend de Course-Ecommerce

API REST en Node.js y Express con PostgreSQL. La base de datos local usa el mismo esquema relacional previsto para Amazon RDS for PostgreSQL; la alta disponibilidad Multi-AZ se configura en AWS, no en Docker.

## Requisitos y configuración

- Node.js 20 o superior.
- Docker Desktop y Docker Compose para PostgreSQL local.
- Actualizar el `.env` local con las variables de `.env.example` y completar `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Para migrar datos, renombrar la variable anterior `MONGO_URI` como `MONGO_SOURCE_URI`; se usa solo en el importador. No incluir `.env` en imágenes.
- Para local con backend ejecutado en el host: `DATABASE_URL=postgresql://course_app:<PASSWORD>@localhost:5432/course_ecommerce_db`.
- Para backend dentro de Docker, utilizar el host de red `postgres` y conectar ambos servicios a `course_app_network`.

## Arranque local

En PowerShell, desde `course-db`:

```powershell
$env:POSTGRES_PASSWORD = "<contraseña-local>"
docker compose up -d
```

Después, desde `course-backend`:

```powershell
npm ci
npm run db:migrate
npm run db:seed
npm run db:create-admin
npm run dev
```

`db:migrate` aplica `src/db/schema.sql` de forma idempotente (esquema inicial; todavía no hay versionado de migraciones incrementales); `db:seed` carga datos de demostración, y `db:create-admin` solo crea la cuenta si aún no existe. Ninguno de estos procesos se ejecuta automáticamente al iniciar cada instancia de la API.

Verificación de disponibilidad y dependencia de datos: `GET /health` o `GET /api/health`. PostgreSQL desconectado produce HTTP 503.

## Migrar datos existentes desde MongoDB

Haz una copia de seguridad de MongoDB y prepara una base PostgreSQL vacía. El script conserva los IDs de Mongo para mantener referencias, transforma documentos a tablas relacionales y ejecuta toda la importación en una transacción. MongoDB solo se lee; si falla la importación, PostgreSQL hace rollback.

1. Configurar `MONGO_SOURCE_URI` con un usuario de solo lectura y `DATABASE_URL` para PostgreSQL.
2. Ejecutar `npm run db:migrate`.
3. Verificar el origen sin escribir: `npm run db:import-mongo -- --dry-run`.
4. Ejecutar `npm run db:import-mongo` contra el destino vacío.
5. Comparar conteos y referencias, validar inicio de sesión, cursos, inscripciones, pagos y respaldos antes de dirigir tráfico al destino.

La herramienta rechaza destinos con registros existentes para evitar mezclar datos accidentalmente. No elimina ni modifica MongoDB. Ejecuta la importación completa dentro de una transacción PostgreSQL y verifica los conteos antes del `COMMIT`. Aun así, valida manualmente relaciones, pagos, montos y flujos funcionales; documenta cualquier transformación o dato que requiera reconciliación antes del corte.

La prueba de integración depende de tener PostgreSQL en ejecución. El código y los Compose se validaron; si Docker no está activo, no se ha comprobado el esquema ni la importación en una base real.

## Scripts

| Comando | Función |
|---|---|
| `npm run dev` | API con recarga de desarrollo |
| `npm start` | API de producción |
| `npm test` | Pruebas del backend |
| `npm run db:migrate` | Crear/actualizar tablas e índices |
| `npm run db:seed` | Cargar catálogo demostrativo |
| `npm run db:create-admin` | Crear administrador inicial, sin reemplazar uno existente |
| `npm run db:import-mongo -- --dry-run` | Revisar conteos antes de importar |

## Esquema

El esquema SQL y sus restricciones están en `src/db/schema.sql`. Las claves primarias de 24 caracteres hexadecimales conservan los ObjectId existentes. Las contraseñas permanecen como hashes bcrypt.

En AWS, usa RDS PostgreSQL Multi-AZ en subredes privadas, TLS con el certificado CA oficial, credenciales gestionadas fuera del repositorio y permisos mínimos. El Compose local es exclusivamente para desarrollo; no representa alta disponibilidad.
