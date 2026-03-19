import prisma from '../config/prisma.js';

// --- HELPERS FORZADOS A HORA LOCAL (CAMPECHE / UTC-6) ---

// 1. Recibe "YYYY-MM-DD" del frontend y lo guarda asumiendo que es medianoche en Campeche (-06:00)
const parseDate = (dateStr) => new Date(`${dateStr}T00:00:00-06:00`);

// 2. Recibe "HH:MM" del frontend y lo guarda asumiendo que es esa hora en Campeche (-06:00)
const parseTime = (timeStr) => timeStr ? new Date(`1970-01-01T${timeStr}:00-06:00`) : null;

// 3. Lee la BD y devuelve "YYYY-MM-DD" exacto en Campeche
const formatDate = (dateObj) => {
  if (!dateObj) return null;
  // 'en-CA' es un formato nativo que siempre devuelve YYYY-MM-DD
  return dateObj.toLocaleDateString('en-CA', { timeZone: 'America/Merida' }); 
};

// 4. Lee la BD y devuelve "HH:MM" (Formato 24h) exacto en Campeche
const formatTime = (timeObj) => {
  if (!timeObj) return null;
  // 'en-GB' fuerza el formato de 24 horas limpio (sin a.m. / p.m.)
  return timeObj.toLocaleTimeString('en-GB', { 
    timeZone: 'America/Merida', 
    hour: '2-digit', 
    minute: '2-digit' 
  }); 
};

const formatSessionResponse = (session) => ({
  ...session,
  sessionDate: formatDate(session.sessionDate),
  sessionTime: formatTime(session.sessionTime)
});
// --------------------------------------------------------

// POST /api/classes/:classId/attendance-sessions
export const createSession = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { sessionDate, sessionTime, method, notes } = req.body;
    const userId = req.user.userId;

    // 1. Validar propiedad de la clase
    const classroom = await prisma.class.findFirst({ where: { id: classId, userId } });
    if (!classroom) return res.status(404).json({ success: false, error: 'Clase no encontrada' });

    // 2. Obtener el total de alumnos inscritos en este momento
    const totalStudents = await prisma.classStudent.count({
      where: { classId }
    });

    // 3. Crear la sesión (El middleware global capturará el P2002 si hay duplicado de fecha)
    const session = await prisma.attendanceSession.create({
      data: {
        classId,
        sessionDate: parseDate(sessionDate),
        sessionTime: parseTime(sessionTime),
        method,
        status: 'in_progress', // Estado inicial
        totalStudents,         // Inicializado dinámicamente
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        justifiedCount: 0,
        notes,
        createdBy: userId
      }
    });

    res.status(201).json({ success: true, session: formatSessionResponse(session) });
  } catch (error) {
    next(error); // Si rompe la restricción @@unique, el errorHandler manda un 409 (Duplicado)
  }
};

// GET /api/classes/:classId/attendance-sessions
export const getClassSessions = async (req, res, next) => {
  try {
    const { classId } = req.params;
    
    // Validamos propiedad
    const classroom = await prisma.class.findFirst({ where: { id: classId, userId: req.user.userId } });
    if (!classroom) return res.status(404).json({ success: false, error: 'Clase no encontrada' });

    const sessions = await prisma.attendanceSession.findMany({
      where: { classId },
      orderBy: { sessionDate: 'desc' }
    });

    res.json({ success: true, sessions: sessions.map(formatSessionResponse) });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance-sessions/:id
export const getSessionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.attendanceSession.findFirst({
      where: { 
        id, 
        class: { userId: req.user.userId } // Validación profunda de propiedad
      },
      include: {
        attendanceRecords: {
          include: { student: true } // Traemos los datos de los alumnos registrados
        }
      }
    });

    if (!session) return res.status(404).json({ success: false, error: 'Sesión no encontrada' });

    res.json({ success: true, session: formatSessionResponse(session) });
  } catch (error) {
    next(error);
  }
};

// PUT /api/attendance-sessions/:id
export const updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar propiedad
    const existing = await prisma.attendanceSession.findFirst({
      where: { id, class: { userId: req.user.userId } }
    });

    if (!existing) return res.status(404).json({ success: false, error: 'Sesión no encontrada' });

    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: req.body
    });

    res.json({ success: true, session: formatSessionResponse(updated) });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/attendance-sessions/:id
export const deleteSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.attendanceSession.findFirst({
      where: { id, class: { userId: req.user.userId } }
    });

    if (!existing) return res.status(404).json({ success: false, error: 'Sesión no encontrada' });

    // Hard Delete (borrado real, porque este modelo no tiene soft delete en tu Prisma)
    await prisma.attendanceSession.delete({ where: { id } });

    res.json({ success: true, message: 'Sesión eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
};