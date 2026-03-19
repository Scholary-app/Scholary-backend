import prisma from '../config/prisma.js';

// --- Funciones auxiliares para el manejo del tiempo ---
// Convierte "08:00" a un objeto Date usando una fecha base neutral en formato UTC
const parseTime = (timeStr) => new Date(`1970-01-01T${timeStr}:00Z`);

// Convierte el objeto Date de la BD de vuelta a "08:00"
const formatTime = (dateObj) => {
  if (!dateObj) return null;
  return dateObj.toISOString().substring(11, 16);
};

// Formateador para un horario completo
const formatScheduleResponse = (schedule) => ({
  ...schedule,
  startTime: formatTime(schedule.startTime),
  endTime: formatTime(schedule.endTime)
});

// GET /api/classes/:classId/schedules
export const getClassSchedules = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const userId = req.user.userId;

    // 1. Validar propiedad de la clase
    const classroom = await prisma.class.findFirst({ where: { id: classId, userId } });
    if (!classroom) return res.status(404).json({ success: false, error: 'Clase no encontrada' });

    // 2. Obtener horarios
    const schedules = await prisma.schedule.findMany({
      where: { classId, active: true }
    });

    res.json({ 
      success: true, 
      schedules: schedules.map(formatScheduleResponse) 
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/classes/:classId/schedules
export const createSchedule = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { startTime, endTime, ...rest } = req.body;
    const userId = req.user.userId;

    // 1. Validar propiedad de la clase
    const classroom = await prisma.class.findFirst({ where: { id: classId, userId } });
    if (!classroom) return res.status(404).json({ success: false, error: 'Clase no encontrada' });

    // 2. Crear el horario transformando las horas a Date
    const schedule = await prisma.schedule.create({
      data: {
        ...rest,
        classId,
        startTime: parseTime(startTime),
        endTime: parseTime(endTime)
      }
    });

    res.status(201).json({ success: true, schedule: formatScheduleResponse(schedule) });
  } catch (error) {
    next(error);
  }
};

// PUT /api/schedules/:id
export const updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, ...rest } = req.body;
    const userId = req.user.userId;

    // 1. Validar que el horario exista y la clase le pertenezca al profesor
    const existingSchedule = await prisma.schedule.findFirst({
      where: { id },
      include: { class: true }
    });

    if (!existingSchedule || existingSchedule.class.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Horario no encontrado o sin permisos' });
    }

    // 2. Preparar la data con las horas transformadas si vienen en la petición
    const updateData = { ...rest };
    if (startTime) updateData.startTime = parseTime(startTime);
    if (endTime) updateData.endTime = parseTime(endTime);

    const updated = await prisma.schedule.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, schedule: formatScheduleResponse(updated) });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/schedules/:id
export const deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 1. Validar permisos a través de la relación de la clase
    const existingSchedule = await prisma.schedule.findFirst({
      where: { id },
      include: { class: true }
    });

    if (!existingSchedule || existingSchedule.class.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Horario no encontrado o sin permisos' });
    }

    // 2. Soft Delete
    await prisma.schedule.update({
      where: { id },
      data: { active: false }
    });

    res.json({ success: true, message: 'Horario eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};