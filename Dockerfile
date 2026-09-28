# Imagen base ligera de Node.js
FROM node:20-alpine

# Definir el directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package*.json ./

# Instalar dependencias del backend
RUN npm ci --only=production

# Copiar el código fuente de la aplicación
COPY . .

# Crear el directorio uploads si no existe
RUN mkdir -p uploads

# Exponer el puerto por defecto de la API
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["npm", "start"]
