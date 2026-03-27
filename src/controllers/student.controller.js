import prisma from '../config/prisma.js';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const ensureStudentQrCode = async (student) => {
  if (student.qrCode) {
    return student;
  }

  return prisma.student.update({
    where: { id: student.id },
    data: { qrCode: `SCHOLARY_STUDENT_${uuidv4()}` },
  });
};

export const getAllStudents = async (req, res, next) => {
  try {
    const students = await prisma.student.findMany({
      where: { 
        userId: req.user.userId,
        active: true 
      },
      orderBy: { fullName: 'asc' } // Ordenamos alfabéticamente
    });
    res.json({ success: true, students });
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findFirst({
      where: { id, userId: req.user.userId, active: true }
    });

    if (!student) return res.status(404).json({ success: false, error: 'Estudiante no encontrado' });

    res.json({ success: true, student });
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req, res, next) => {
  try {
    // Generamos el identificador único para el QR
    const qrData = `SCHOLARY_STUDENT_${uuidv4()}`;
    
    const student = await prisma.student.create({
      data: {
        ...req.body,
        userId: req.user.userId,
        qrCode: qrData // Lo guardamos en la base de datos
      }
    });
    
    res.status(201).json({ success: true, student });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await prisma.student.updateMany({
      where: { id, userId: req.user.userId },
      data: req.body
    });

    if (result.count === 0) return res.status(404).json({ success: false, error: 'Estudiante no encontrado o sin permisos' });

    const updatedStudent = await prisma.student.findUnique({ where: { id } });
    res.json({ success: true, student: updatedStudent });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Soft Delete
    const result = await prisma.student.updateMany({
      where: { id, userId: req.user.userId },
      data: { active: false }
    });

    if (result.count === 0) return res.status(404).json({ success: false, error: 'Estudiante no encontrado o sin permisos' });

    res.json({ success: true, message: 'Estudiante eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};

// Obtener el código QR en formato imagen Base64
export const getStudentQR = async (req, res, next) => {
  try {
    let student = await prisma.student.findFirst({
      where: { id: req.params.id, userId: req.user.userId, active: true }
    });
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Estudiante no encontrado' });
    }

    // Si es un alumno legado sin qrCode, lo generamos en el momento.
    student = await ensureStudentQrCode(student);
    
    // Generar imagen en base64 usando el dato único del estudiante
    const qrImage = await QRCode.toDataURL(student.qrCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({ success: true, qrCode: qrImage });
  } catch (error) {
    next(error);
  }
};

// Obtener todos los QR de una clase en una sola llamada
export const getClassStudentsQrs = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const userId = req.user.userId;

    const classroom = await prisma.class.findFirst({
      where: { id: classId, userId, active: true },
    });

    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Clase no encontrada' });
    }

    const enrollments = await prisma.classStudent.findMany({
      where: {
        classId,
        student: {
          active: true,
        },
      },
      include: {
        student: true,
      },
      orderBy: {
        student: {
          fullName: 'asc',
        },
      },
    });

    const qrPayload = await Promise.all(
      enrollments.map(async ({ student }) => {
        const ensuredStudent = await ensureStudentQrCode(student);
        const qrImage = await QRCode.toDataURL(ensuredStudent.qrCode, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        return {
          id: ensuredStudent.id,
          fullName: ensuredStudent.fullName,
          studentId: ensuredStudent.studentId,
          email: ensuredStudent.email,
          qrCode: qrImage,
        };
      })
    );

    res.json({ success: true, qrs: qrPayload });
  } catch (error) {
    next(error);
  }
};