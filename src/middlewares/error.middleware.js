export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
      details: err.details
    });
  }
  
  if (err.code === 'P2002') { // Prisma: Violación de restricción única (ej. email duplicado)
    return res.status(409).json({
      success: false,
      error: 'Registro duplicado. Este dato ya existe en la base de datos.'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'La ruta solicitada no existe'
  });
};