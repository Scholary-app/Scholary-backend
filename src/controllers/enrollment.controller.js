import prisma from '../config/prisma.js';

// POST /api/classes/:classId/students
export const enrollStudents = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { studentIds } = req.body;
    const userId = req.user.userId;

    // 1. Validar que la clase existe y pertenece al usuario
    const classroom = await prisma.class.findFirst({
      where: { id: classId, userId }
    });
    
    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Clase no encontrada o sin permisos' });
    }

    // 2. Validar que los estudiantes existen y pertenecen al usuario
    const validStudents = await prisma.student.findMany({
      where: { 
        id: { in: studentIds },
        userId 
      }
    });

    if (validStudents.length === 0) {
      return res.status(400).json({ success: false, error: 'Ninguno de los estudiantes proporcionados es válido' });
    }

    // Extraemos solo los IDs que sí le pertenecen al profesor
    const validStudentIds = validStudents.map(student => student.id);

    // 3. Crear las inscripciones (evitando duplicados automáticamente)
    const enrollmentsData = validStudentIds.map(studentId => ({
      classId,
      studentId
    }));

    // skipDuplicates: true es magia pura de Prisma para evitar el error de constraint unique
    const result = await prisma.classStudent.createMany({
      data: enrollmentsData,
      skipDuplicates: true
    });

    res.status(201).json({ 
      success: true, 
      message: `${result.count} estudiante(s) inscrito(s) exitosamente`
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/classes/:classId/students
export const getClassStudents = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const userId = req.user.userId;

    // 1. Validar propiedad de la clase
    const classroom = await prisma.class.findFirst({
      where: { id: classId, userId }
    });

    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Clase no encontrada' });
    }

    // 2. Obtener inscripciones incluyendo toda la información del alumno
    const enrollments = await prisma.classStudent.findMany({
      where: { classId },
      include: { 
        student: true // Traemos toda la info del estudiante
      },
      orderBy: { 
        student: { fullName: 'asc' } // Orden alfabético
      }
    });

    // 3. Formatear la respuesta para que sea más limpia
    const students = enrollments.map(enrollment => ({
      ...enrollment.student,
      enrollmentId: enrollment.id,
      enrolledAt: enrollment.enrolledAt,
      enrollmentStatus: enrollment.status
    }));

    res.json({ success: true, students });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/classes/:classId/students/:studentId
export const unenrollStudent = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;
    const userId = req.user.userId;

    // 1. Validar propiedad de la clase
    const classroom = await prisma.class.findFirst({
      where: { id: classId, userId }
    });

    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Clase no encontrada' });
    }

    // 2. Eliminar la inscripción
    const result = await prisma.classStudent.deleteMany({
      where: { classId, studentId }
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, error: 'El estudiante no está inscrito en esta clase' });
    }

    res.json({ success: true, message: 'Estudiante desinscrito de la clase exitosamente' });
  } catch (error) {
    next(error);
  }
};