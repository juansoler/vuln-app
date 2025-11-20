# Imagen base de Node.js
FROM node:20

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código de la aplicación
COPY server.js ./

# Crear directorio para la base de datos
RUN mkdir -p /data

# Variable de entorno para la base de datos
ENV DB_PATH=/data/data.db

# Exponer puerto de la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
