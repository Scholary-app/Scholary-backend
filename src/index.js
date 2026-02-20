import app from './app.js';
import { config, validateConfig } from './config/constants.js';

/**
 * Iniciar el servidor
 */
const startServer = () => {
  try {
    // Validar configuración
    validateConfig();
    
    // Iniciar servidor
    app.listen(config.PORT, () => {
      console.log('========================================');
      console.log('🚀 Scholary Backend Server');
      console.log('========================================');
      console.log(`📡 Server running on port: ${config.PORT}`);
      console.log(`🌍 Environment: ${config.NODE_ENV}`);
      console.log(`🔗 URL: http://localhost:${config.PORT}`);
      console.log(`✅ Health check: http://localhost:${config.PORT}/health`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar servidor
startServer();
