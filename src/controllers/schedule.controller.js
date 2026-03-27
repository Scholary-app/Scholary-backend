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

const formatDateInMerida = (dateObj) => {
  if (!dateObj) return null;
  return dateObj.toLocaleDateString('en-CA', { timeZone: 'America/Merida' });
};

const getDayNameInMerida = (dateStr) => {
  const date = new Date(`${dateStr}T12:00:00-06:00`);
  const dayName = date.toLocaleDateString('es-MX', { weekday: 'long', timeZone: 'America/Merida' });
  return dayName.charAt(0).toUpperCase() + dayName.slice(1);
};

const getTodayMerida = () => formatDateInMerida(new Date());

const buildSessionDateRange = (dateStr) => {
  const start = new Date(`${dateStr}T00:00:00-06:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

// GET /api/schedules/day?date=YYYY-MM-DD
export const getDailySchedule = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const requestedDate = typeof req.query.date === 'string' ? req.query.date : null;
    const dateStr = requestedDate || getTodayMerida();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ success: false, error: 'El parámetro date debe tener formato YYYY-MM-DD' });
    }

    const dayOfWeek = getDayNameInMerida(dateStr);

    const schedules = await prisma.schedule.findMany({
      where: {
        dayOfWeek,
        active: true,
        class: {
          userId,
          active: true,
        },
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            group: true,
            _count: {
              select: { classStudents: true },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const classIds = [...new Set(schedules.map((schedule) => schedule.class.id))];
    const { start, end } = buildSessionDateRange(dateStr);

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        classId: { in: classIds },
        sessionDate: {
          gte: start,
          lt: end,
        },
      },
      select: {
        id: true,
        classId: true,
        status: true,
        presentCount: true,
        lateCount: true,
        absentCount: true,
        justifiedCount: true,
      },
    });

    const sessionsByClassId = new Map(sessions.map((session) => [session.classId, session]));

    const items = schedules.map((schedule) => {
      const session = sessionsByClassId.get(schedule.class.id);
      const attendanceTotal = session
        ? session.presentCount + session.lateCount + session.absentCount + session.justifiedCount
        : 0;
      const isCompleted = !!session && (session.status === 'completed' || attendanceTotal > 0);

      return {
        id: schedule.id,
        classId: schedule.class.id,
        sessionId: session?.id || null,
        subject: schedule.class.name,
        group: schedule.class.group || 'Grupo A',
        totalStudents: schedule.class._count.classStudents,
        dayOfWeek: schedule.dayOfWeek,
        time: formatTime(schedule.startTime),
        endTime: formatTime(schedule.endTime),
        status: isCompleted ? 'completed' : 'pending',
        attendance: session
          ? {
              present: session.presentCount,
              late: session.lateCount,
              absent: session.absentCount,
              justified: session.justifiedCount,
            }
          : null,
      };
    });

    const pendingCount = items.filter((item) => item.status === 'pending').length;

    res.json({
      success: true,
      date: dateStr,
      dayOfWeek,
      pendingCount,
      items,
    });
  } catch (error) {
    next(error);
  }
};

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