import prisma from '../config/prisma.js';

export const getAllClasses = async (req, res, next) => {
  try {
    const classes = await prisma.class.findMany({
      where: { 
        userId: req.user.userId,
        active: true // Solo mostramos las activas por defecto
      },
      include: {
        schedules: {
          where: { active: true },
          select: { id: true }
        },
        _count: {
          select: { classStudents: true } // Conteo automático de estudiantes
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const classesWithScheduleCount = classes.map((classItem) => {
      const { schedules, ...rest } = classItem;

      return {
        ...rest,
        _count: {
          ...rest._count,
          schedules: schedules.length,
        },
      };
    });

    res.json({ success: true, classes: classesWithScheduleCount });
  } catch (error) {
    next(error);
  }
};

export const getClassById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await prisma.class.findFirst({
      where: { 
        id, 
        userId: req.user.userId,
        active: true 
      },
      include: {
        schedules: {
          where: { active: true },
          select: { id: true }
        },
        _count: {
          select: { classStudents: true } 
        }
      }
    });

    if (!classroom) return res.status(404).json({ success: false, error: 'Clase no encontrada' });

    const { schedules, ...restClassroom } = classroom;

    res.json({
      success: true,
      class: {
        ...restClassroom,
        _count: {
          ...restClassroom._count,
          schedules: schedules.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createClass = async (req, res, next) => {
  try {
    const newClass = await prisma.class.create({
      data: {
        ...req.body,
        userId: req.user.userId
      }
    });
    res.status(201).json({ success: true, class: newClass });
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Verificamos propiedad antes de actualizar
    const classroom = await prisma.class.updateMany({
      where: { id, userId: req.user.userId },
      data: req.body
    });

    if (classroom.count === 0) return res.status(404).json({ success: false, error: 'Clase no encontrada' });

    const updated = await prisma.class.findUnique({ where: { id } });
    res.json({ success: true, class: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Hacemos un "Soft Delete" usando el campo active del esquema 
    const classroom = await prisma.class.updateMany({
      where: { id, userId: req.user.userId },
      data: { active: false }
    });

    if (classroom.count === 0) return res.status(404).json({ success: false, error: 'Clase no encontrada' });

    res.json({ success: true, message: 'Clase desactivada exitosamente' });
  } catch (error) {
    next(error);
  }
};