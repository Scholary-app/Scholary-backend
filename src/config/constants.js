import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Configuración de constantes de la aplicación
 */
export const config = {
  // Servidor
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Base de datos
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000'],
};

/**
 * Validar que las variables de entorno requeridas estén configuradas
 */
export const validateConfig = () => {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Variables de entorno faltantes:', missingVars.join(', '));
    console.warn('⚠️  Algunas funcionalidades pueden no estar disponibles');
  }
};
