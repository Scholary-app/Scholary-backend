import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/constants.js';

/**
 * Crear y configurar la aplicación Express
 */
const app = express();

// ======================
// MIDDLEWARES DE SEGURIDAD
// ======================

// Helmet - Configuración de headers de seguridad
app.use(helmet());

// CORS - Configuración de Cross-Origin Resource Sharing
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    
    if (config.ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Permitir envío de cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ======================
// MIDDLEWARES DE PARSEO
// ======================

// Body parser - JSON
app.use(express.json({ limit: '10mb' }));

// Body parser - URL encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// ======================
// MIDDLEWARES DE LOGGING
// ======================

// Morgan - HTTP request logger
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ======================
// RUTAS
// ======================

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Scholary API is running',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Scholary API',
    version: '1.0.0',
    documentation: '/api-docs', // Para futura documentación Swagger
  });
});

// TODO: Importar y usar rutas de la API
// import authRoutes from './routes/auth.routes.js';
// app.use('/api/auth', authRoutes);

// ======================
// MANEJO DE ERRORES
// ======================

// Ruta no encontrada - 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
