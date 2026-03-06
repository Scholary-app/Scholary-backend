import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

// Middlewares globales
app.use(helmet()); // Protege la app configurando varios encabezados HTTP
app.use(cors()); // Permite peticiones cruzadas (CORS) desde tu frontend
app.use(express.json()); // Permite a la API recibir datos en formato JSON
app.use(morgan('dev')); // Muestra un log de las peticiones en la terminal

// Ruta de prueba 
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: '¡La API de Scholary está funcionando correctamente! 🚀' 
  });
});


export default app;