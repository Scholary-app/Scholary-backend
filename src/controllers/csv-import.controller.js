import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma.js';

// Extraer matrícula del email (ej: al071392@uacam.mx → 71392)
function extractEnrollmentFromEmail(email) {
  if (!email || typeof email !== 'string') return null;

  const localPart = email.split('@')[0]?.trim() || '';
  if (!localPart) return null;

  // Remover prefijo "al0" o "al"
  const withoutPrefix = localPart.replace(/^al0+/i, '').replace(/^al/i, '');
  
  // Extraer solo dígitos
  const onlyDigits = withoutPrefix.replace(/\D/g, '');

  if (onlyDigits.length > 0) {
    // Remover ceros iniciales
    const withoutLeadingZeros = onlyDigits.replace(/^0+/, '') || '0';
    return withoutLeadingZeros;
  }

  // Si no hay dígitos, devolver la parte sin prefijo
  return withoutPrefix || null;
}

// Detectar y normalizar formato de CSV
function normalizeCSVRecords(records) {
  if (!records || records.length === 0) {
    return { success: false, error: 'CSV vacío', records: [] };
  }

  const firstRecord = records[0];
  const columns = Object.keys(firstRecord);

  // Detectar formato 1: studentId, fullName, email
  const hasFormat1 = columns.includes('studentId') && columns.includes('fullName');

  // Detectar formato 2: Apellidos, Nombre, Dirección de correo (desde Google Classroom)
  const hasFormat2 = (columns.includes('Apellidos') || columns.includes('Nombre')) && 
                     columns.includes('Dirección de correo');

  if (!hasFormat1 && !hasFormat2) {
    return {
      success: false,
      error: `Formato CSV no reconocido. Columnas encontradas: ${columns.join(', ')}. Se esperan: (studentId, fullName) o (Apellidos, Nombre, Dirección de correo)`,
      records: [],
    };
  }

  // Normalizar registros según formato
  const normalizedRecords = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    // Saltar filas de metadata
    if (hasFormat2) {
      const apellidos = row['Apellidos']?.trim() || '';
      const nombre = row['Nombre']?.trim() || '';
      
      // Saltar si es una fila de metadata (Fecha, Puntos, etc.)
      if (apellidos.toLowerCase() === 'fecha' || apellidos.toLowerCase() === 'puntos' ||
          apellidos.toLowerCase() === '' && nombre.toLowerCase() === 'fecha') {
        continue;
      }

      // Saltar filas vacías
      if (!apellidos && !nombre) {
        continue;
      }
    }

    let normalized;

    if (hasFormat1) {
      // Formato 1: Direct mapping
      const email = row.email?.trim() || null;
      let studentId = row.studentId?.trim();
      
      // Si no hay studentId, intentar extraerlo del email
      if (!studentId && email) {
        studentId = extractEnrollmentFromEmail(email);
      }
      
      // Si aún no hay studentId, generar uno
      if (!studentId) {
        studentId = `STU_${uuidv4().substring(0, 8)}`;
      }

      normalized = {
        studentId,
        fullName: row.fullName?.trim() || '',
        email,
      };
    } else {
      // Formato 2: Map from Apellidos/Nombre/Dirección de correo
      const apellidos = row['Apellidos']?.trim() || '';
      const nombre = row['Nombre']?.trim() || '';
      const email = row['Dirección de correo']?.trim() || null;

      const fullName = [apellidos, nombre].filter(Boolean).join(' ');
      
      // Extraer studentId del email (ej: al071392@uacam.mx → 71392)
      let studentId = null;
      if (email) {
        studentId = extractEnrollmentFromEmail(email);
      }
      
      // Si no se pudo extraer, generar uno
      if (!studentId) {
        studentId = `STU_${uuidv4().substring(0, 8)}`;
      }

      normalized = {
        studentId,
        fullName: fullName || 'Estudiante sin nombre',
        email,
      };
    }

    // Validar que fullName no esté vacío
    if (normalized.fullName.trim()) {
      normalizedRecords.push(normalized);
    }
  }

  return {
    success: true,
    records: normalizedRecords,
    detectedFormat: hasFormat1 ? 'Format1 (studentId, fullName, email)' : 'Format2 (Apellidos, Nombre, Dirección de correo)',
  };
}

export const importClassesFromCsv = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { className, subject, group, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se subió ningún archivo CSV',
      });
    }

    if (!className || className.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la clase es obligatorio',
      });
    }

    // Parsear CSV
    let records;
    try {
      const csvContent = req.file.buffer.toString('utf-8');
      records = parse(csvContent, {
        bom: true,
        columns: true,
        skip_empty_lines: false,
        trim: true,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Error al parsear CSV: ${error.message}`,
      });
    }

    // Normalizar y validar formato
    const normalizationResult = normalizeCSVRecords(records);
    if (!normalizationResult.success) {
      return res.status(400).json({
        success: false,
        error: normalizationResult.error,
      });
    }

    const normalizedRecords = normalizationResult.records;
    if (normalizedRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El archivo CSV no contiene registros válidos después de procesar',
      });
    }

    // 1. Crear la clase
    let scholaryClass;
    try {
      scholaryClass = await prisma.class.create({
        data: {
          userId,
          name: className.trim(),
          subject: subject?.trim() || null,
          group: group?.trim() || null,
          description: description?.trim() || null,
          color: '#7C3AED',
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: `Error al crear la clase: ${error.message}`,
      });
    }

    // 2. Crear estudiantes y relaciones
    const createdStudents = [];
    const errors = [];

    for (let i = 0; i < normalizedRecords.length; i++) {
      try {
        const row = normalizedRecords[i];
        const studentId = row.studentId?.trim();
        const fullName = row.fullName?.trim();
        const email = row.email?.trim() || null;

        if (!studentId || !fullName) {
          errors.push(`Registro ${i + 1}: studentId y fullName son obligatorios`);
          continue;
        }

        // Crear estudiante si no existe
        let student = await prisma.student.findFirst({
          where: {
            userId,
            studentId,
          },
        });

        if (!student) {
          student = await prisma.student.create({
            data: {
              userId,
              studentId,
              fullName,
              email,
              qrCode: `SCHOLARY_STUDENT_${uuidv4()}`,
            },
          });
        } else {
          // Actualizar datos del estudiante
          student = await prisma.student.update({
            where: { id: student.id },
            data: {
              fullName,
              email: email || student.email,
            },
          });
        }

        // Crear relación ClassStudent
        await prisma.classStudent.upsert({
          where: {
            unique_class_student: {
              classId: scholaryClass.id,
              studentId: student.id,
            },
          },
          update: { status: 'active' },
          create: {
            classId: scholaryClass.id,
            studentId: student.id,
            status: 'active',
          },
        });

        createdStudents.push({
          studentId,
          fullName,
          email,
        });
      } catch (error) {
        errors.push(`Registro ${i + 1}: ${error.message}`);
      }
    }

    res.status(201).json({
      success: true,
      class: scholaryClass,
      importedStudents: createdStudents.length,
      totalRecords: normalizedRecords.length,
      students: createdStudents,
      detectedFormat: normalizationResult.detectedFormat,
      ...(errors.length > 0 && { warnings: errors }),
      message: `Clase creada con ${createdStudents.length} estudiantes importados`,
    });
  } catch (error) {
    next(error);
  }
};
