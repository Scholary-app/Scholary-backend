import prisma from '../config/prisma.js';

export const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        institution: true,
        lateToleranceMinutes: true,
        applyThreeStrikesRule: true,
        createdAt: true,
        lastLogin: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuario no encontrado' 
      });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: req.body, // Validado previamente por Zod
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        institution: true,
        lateToleranceMinutes: true,
        applyThreeStrikesRule: true
      }
    });
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { lateToleranceMinutes, applyThreeStrikesRule } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        // Solo actualizamos los campos que vengan en la petición
        ...(lateToleranceMinutes !== undefined && { lateToleranceMinutes }),
        ...(applyThreeStrikesRule !== undefined && { applyThreeStrikesRule })
      },
      select: {
        lateToleranceMinutes: true,
        applyThreeStrikesRule: true
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Configuración actualizada',
      settings: user 
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    await prisma.user.delete({
      where: { id: req.user.userId }
    });
    
    res.json({ 
      success: true, 
      message: 'Cuenta eliminada exitosamente' 
    });
  } catch (error) {
    next(error);
  }
};