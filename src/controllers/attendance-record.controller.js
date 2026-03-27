import prisma from '../config/prisma.js';

// --- FUNCIÓN AUXILIAR: Actualizar contadores ---
const updateSessionCounters = async (sessionId) => {
  const records = await prisma.attendanceRecord.groupBy({
    by: ['status'],
    where: { attendanceSessionId: sessionId },
    _count: true
  });
  
  let presentCount = 0, absentCount = 0, lateCount = 0, justifiedCount = 0;
  
  records.forEach(r => {
    if (r.status === 'present') presentCount = r._count;
    if (r.status === 'absent') absentCount = r._count;
    if (r.status === 'late') lateCount = r._count;
    if (r.status === 'justified') justifiedCount = r._count;
  });

  await prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { presentCount, absentCount, lateCount, justifiedCount }
  });
};

// --- FUNCIÓN AUXILIAR: Calcular Retardo ---
const calculateFinalStatus = (session, schedule, status, checkInTime) => {
  if (!schedule || status !== 'present') return status;

  const tolerance = session.class.user.lateToleranceMinutes;
  
  // 1. Extraer fecha exacta y hora exacta en Campeche
  const dateStr = session.sessionDate.toLocaleDateString('en-CA', { timeZone: 'America/Merida' });
  const timeStr = schedule.startTime.toLocaleTimeString('en-GB', { timeZone: 'America/Merida', hour: '2-digit', minute: '2-digit' });
  
  // 2. Crear un objeto Date del momento exacto en que inició la clase
  const classStart = new Date(`${dateStr}T${timeStr}:00-06:00`);
  
  // 3. Sumar la tolerancia en milisegundos
  const lateThreshold = new Date(classStart.getTime() + tolerance * 60000);
  
  // 4. Si la hora de escaneo superó el límite, es retardo
  return checkInTime > lateThreshold ? 'late' : 'present';
};



export const createRecord = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { studentId, status, notes } = req.body;
    
    // 1. Obtener sesión, clase, usuario y horarios
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { class: { include: { user: true, schedules: true } } }
    });
    
    if (!session || session.class.userId !== req.user.userId) {
      return res.status(404).json({ success: false, error: 'Sesión no encontrada o sin permisos' });
    }

    const classEnrollment = await prisma.classStudent.findFirst({
      where: {
        classId: session.classId,
        studentId,
        status: 'active',
      },
      select: { id: true },
    });

    if (!classEnrollment) {
      return res.status(400).json({
        success: false,
        error: 'El alumno escaneado no pertenece a esta clase',
      });
    }
    
    // 2. Determinar el día de la semana asegurando la zona horaria
    const dateStr = session.sessionDate.toLocaleDateString('en-CA', { timeZone: 'America/Merida' });
    const dayIndex = new Date(`${dateStr}T12:00:00-06:00`).getDay();
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayOfWeek = dayNames[dayIndex];
    
    const schedule = session.class.schedules.find(s => s.dayOfWeek === dayOfWeek);
    const checkInTime = new Date(); // La hora exacta del escaneo
    
    // 3. Calcular si tiene retardo
    const finalStatus = calculateFinalStatus(session, schedule, status, checkInTime);
    
    // 4. Crear registro
    const record = await prisma.attendanceRecord.create({
      data: {
        attendanceSessionId: sessionId,
        studentId,
        status: finalStatus,
        checkInTime,
        notes
      }
    });
    
    // 5. Actualizar contadores
    await updateSessionCounters(sessionId);
    
    res.status(201).json({ success: true, record });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Este alumno ya fue registrado en esta sesión',
      });
    }

    next(error);
  }
};

// Escaneo QR
export const scanRecord = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { qrCode } = req.body;
    
    // 1. Buscar estudiante por QR
    const student = await prisma.student.findUnique({ where: { qrCode } });
    if (!student || student.userId !== req.user.userId) {
      return res.status(404).json({ success: false, error: 'Código QR no reconocido' });
    }

    // Para reutilizar lógica, inyectamos los datos como si fuera una petición manual y llamamos a createRecord
    req.body = { studentId: student.id, status: 'present' };
    return createRecord(req, res, next);
  } catch (error) {
    next(error);
  }
};

export const getSessionRecords = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const records = await prisma.attendanceRecord.findMany({
      where: { attendanceSessionId: sessionId },
      include: { student: true },
      orderBy: { checkInTime: 'desc' }
    });
    res.json({ success: true, records });
  } catch (error) {
    next(error);
  }
};

export const updateRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const record = await prisma.attendanceRecord.update({
      where: { id },
      data: { status, notes }
    });

    await updateSessionCounters(record.attendanceSessionId);
    
    res.json({ success: true, record });
  } catch (error) {
    next(error);
  }
};

export const deleteRecord = async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = await prisma.attendanceRecord.delete({
      where: { id }
    });

    await updateSessionCounters(record.attendanceSessionId);

    res.json({ success: true, message: 'Registro eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};