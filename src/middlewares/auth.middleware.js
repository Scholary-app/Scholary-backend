import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // El formato es "Bearer <token>", así que lo separamos
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token requerido' 
    });
  }

  // Usamos la misma clave secreta con la que creamos el token
  jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_super_seguro_scholary_2026', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'Token inválido o expirado' 
      });
    }
    
    // Guardamos los datos del usuario en la request para usarlos en el controlador
    req.user = user;
    next();
  });
};