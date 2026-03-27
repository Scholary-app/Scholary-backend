import prisma from '../config/prisma.js';
import { v4 as uuidv4 } from 'uuid';

const CLASSROOM_API_BASE = 'https://classroom.googleapis.com';

/**
 * Hace un request a la API de Google Classroom con manejo robusto de errores.
 */
const makeClassroomRequest = async (accessToken, path) => {
  const response = await fetch(`${CLASSROOM_API_BASE}${path}`, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const location = response.headers.get('location') || '';
  const rawBody = await response.text();

  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = null;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    redirected: response.status >= 300 && response.status < 400,
    location,
    contentType,
    data,
    rawBody,
  };
};

/**
 * POST /api/classes/import-from-classroom
 * Importa clases y estudiantes desde Google Classroom
 */
export const importFromClassroom = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // 1. Obtener el usuario con sus tokens de Google
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.googleAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'No tienes Google Classroom sincronizado. Inicia sesión con Google primero.'
      });
    }

    // 2. Obtener lista de clases desde Google Classroom
    let classroomList;
    try {
      const response = await makeClassroomRequest(
        user.googleAccessToken,
        '/v1/courses?pageSize=100&courseStates=ACTIVE'
      );

      if (!response.ok) {
        const googleMessage = response.data?.error?.message || response.rawBody?.slice(0, 200) || 'Error desconocido de Google';
        if (response.status === 401 || response.redirected) {
          throw new Error('Tu sesión de Google Classroom expiró o no tiene permisos. Cierra sesión e inicia con Google de nuevo.');
        }
        throw new Error(`Google API returned ${response.status}: ${googleMessage}`);
      }

      if (!response.data) {
        const snippet = response.rawBody?.slice(0, 200) || 'sin contenido';
        throw new Error(
          `Google Classroom devolvió contenido no JSON (status ${response.status}, content-type: ${response.contentType || 'desconocido'}). Snippet: ${snippet}`
        );
      }

      classroomList = response.data.courses || [];
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Error al conectar con Google Classroom: ${error.message}`
      });
    }

    if (!classroomList.length) {
      return res.json({
        success: true,
        importedClasses: [],
        message: 'No hay clases en Google Classroom'
      });
    }

    // 3. Importar cada clase y sus estudiantes
    const importedClasses = [];

    for (const classroomCourse of classroomList) {
      try {
        // Crear la clase en Scholary si no existe
        let scholaryClass = await prisma.class.findFirst({
          where: {
            userId,
            name: classroomCourse.name
          }
        });

        if (!scholaryClass) {
          // Extraer el nombre del tema (subject) si está disponible
          const description = classroomCourse.description || '';
          
          scholaryClass = await prisma.class.create({
            data: {
              userId,
              name: classroomCourse.name,
              subject: classroomCourse.section || 'Sin asignatura',
              description: description,
              group: classroomCourse.section || 'Grupo A',
              color: '#7C3AED' // Color por defecto
            }
          });
        }

        // 4. Obtener estudiantes de la clase
        let studentsList = [];
        try {
          const response = await makeClassroomRequest(
            user.googleAccessToken,
            `/v1/courses/${classroomCourse.id}/students?pageSize=100`
          );

          if (response.ok && response.data) {
            studentsList = response.data.students || [];
          } else if (response.status === 401 || response.redirected) {
            console.error(
              `Google token inválido/expirado al leer alumnos de clase ${classroomCourse.id}. status=${response.status} location=${response.location}`
            );
          } else {
            console.error(
              `No se pudieron obtener alumnos de la clase ${classroomCourse.id}. status=${response.status} body=${(response.rawBody || '').slice(0, 200)}`
            );
          }
        } catch (error) {
          console.error(`Error importing students for class ${classroomCourse.id}:`, error.message);
          // Continuamos sin los estudiantes si falla
        }

        // 5. Crear/actualizar estudiantes y crear relaciones ClassStudent
        for (const classroomStudent of studentsList) {
          try {
            const studentEmail = classroomStudent.profile?.emailAddress;
            const studentName = classroomStudent.profile?.name?.fullName || 'Estudiante sin nombre';
            const studentId = classroomStudent.userId || classroomStudent.profile?.id;
            const photoUrl = classroomStudent.profile?.photoUrl || null;

            // Crear estudiante si no existe
            let scholaryStudent = await prisma.student.findFirst({
              where: {
                userId,
                email: studentEmail || undefined,
                studentId: studentId
              }
            });

            if (!scholaryStudent) {
              scholaryStudent = await prisma.student.create({
                data: {
                  userId,
                  studentId: studentId,
                  fullName: studentName,
                  email: studentEmail,
                  avatarUrl: photoUrl,
                  qrCode: `SCHOLARY_STUDENT_${uuidv4()}`
                }
              });
            } else {
              // Refresca datos de perfil cuando el alumno ya existe para mantener foto/nombre actualizados.
              scholaryStudent = await prisma.student.update({
                where: { id: scholaryStudent.id },
                data: {
                  fullName: studentName,
                  email: studentEmail,
                  avatarUrl: photoUrl || scholaryStudent.avatarUrl,
                  ...(scholaryStudent.qrCode ? {} : { qrCode: `SCHOLARY_STUDENT_${uuidv4()}` }),
                },
              });
            }

            // Crear relación ClassStudent si no existe
            await prisma.classStudent.upsert({
              where: {
                unique_class_student: {
                  classId: scholaryClass.id,
                  studentId: scholaryStudent.id
                }
              },
              update: { status: 'active' },
              create: {
                classId: scholaryClass.id,
                studentId: scholaryStudent.id,
                status: 'active'
              }
            });
          } catch (error) {
            console.error(`Error importing student:`, error.message);
            // Continuamos con el siguiente estudiante
          }
        }

        importedClasses.push({
          id: scholaryClass.id,
          name: scholaryClass.name,
          studentCount: studentsList.length
        });

      } catch (error) {
        console.error(`Error importing class ${classroomCourse.name}:`, error.message);
        // Continuamos con la siguiente clase
      }
    }

    res.json({
      success: true,
      importedClasses,
      totalClasses: importedClasses.length,
      message: `Se importaron ${importedClasses.length} clases exitosamente`
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/classes/classroom-list
 * Obtiene lista previa de clases de Google Classroom sin importar
 */
export const getClassroomClassesList = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Obtener el usuario con sus tokens
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.googleAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'No tienes Google Classroom sincronizado'
      });
    }

    try {
      const response = await makeClassroomRequest(
        user.googleAccessToken,
        '/v1/courses?pageSize=100&courseStates=ACTIVE'
      );

      if (!response.ok) {
        return res.status(400).json({
          success: false,
          error: `Error al conectar con Google Classroom: ${response.data?.error?.message || response.rawBody?.slice(0, 200) || 'Unknown error'}`
        });
      }

      if (!response.data) {
        return res.status(400).json({
          success: false,
          error: `Google Classroom devolvió una respuesta no JSON (content-type: ${response.contentType || 'desconocido'})`
        });
      }

      const courses = response.data.courses || [];

      res.json({
        success: true,
        courses: courses.map(course => ({
          id: course.id,
          name: course.name,
          section: course.section,
          description: course.description
        }))
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: `Error al obtener clases: ${error.message}`
      });
    }

  } catch (error) {
    next(error);
  }
};
