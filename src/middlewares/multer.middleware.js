import multer from 'multer';

// Configurar almacenamiento en memoria para archivos CSV
const storage = multer.memoryStorage();

// Filtro para permitir solo archivos CSV
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos CSV'), false);
  }
};

export const csvUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
});
