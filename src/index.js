// src/index.js
import 'dotenv/config'; // Carga automáticamente las variables del archivo .env
import app from './app.js';
import prisma from './config/prisma.js';

// Definimos el puerto (usa el del .env o el 3000 por defecto)
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Verificamos la conexión a la base de datos antes de levantar el servidor
    await prisma.$connect();
    console.log(' Conectado a la base de datos PostgreSQL (Supabase) exitosamente.');

    // Levantamos el servidor
    app.listen(PORT, () => {
      console.log(` Servidor de Scholary corriendo en: http://localhost:${PORT}`);
      console.log(` Health check disponible en: http://localhost:${PORT}/api/health`);
    });

  } catch (error) {
    console.error('🔴 Error fatal al iniciar el servidor o conectar a la BD:', error);
    // Desconectamos Prisma en caso de error y cerramos el proceso
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Inicializar todo
startServer();