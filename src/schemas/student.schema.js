import { z } from 'zod';

// Validamos que el género solo pueda ser uno de estos 3 valores
const genderEnum = z.enum(['male', 'female', 'other']);

export const createStudentSchema = z.object({
  body: z.object({
    studentId: z.string().min(1, "La matrícula es obligatoria").max(50),
    fullName: z.string().min(3).max(255),
    email: z.string().email("Debe ser un correo válido").max(255).optional().or(z.literal('')),
    phone: z.string().max(20).optional().nullable(),
    gender: genderEnum.optional().nullable(),
    avatarUrl: z.string().url().optional().nullable(),
    notes: z.string().optional().nullable()
  })
});

export const updateStudentSchema = z.object({
  body: z.object({
    studentId: z.string().min(1).max(50).optional(),
    fullName: z.string().min(3).max(255).optional(),
    email: z.string().email().max(255).optional().or(z.literal('')),
    phone: z.string().max(20).optional().nullable(),
    gender: genderEnum.optional().nullable(),
    avatarUrl: z.string().url().optional().nullable(),
    notes: z.string().optional().nullable(),
    active: z.boolean().optional()
  })
});