import { z } from 'zod';

export const csvImportSchema = z.object({
  body: z.object({
    className: z.string().min(1).max(255).describe('Nombre de la clase a crear'),
    subject: z.string().max(255).optional().nullable().describe('Asignatura'),
    group: z.string().max(50).optional().nullable().describe('Grupo'),
    description: z.string().optional().nullable().describe('Descripción'),
  }),
});

export const studentRowSchema = z.object({
  studentId: z.string().min(1).describe('ID del estudiante'),
  fullName: z.string().min(1).describe('Nombre completo del estudiante'),
  email: z.string().email().optional().describe('Correo del estudiante'),
});
