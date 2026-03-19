import { z } from 'zod';

const validStatuses = ['present', 'absent', 'late', 'justified'];

export const createRecordSchema = z.object({
  body: z.object({
    studentId: z.string().uuid("ID de estudiante inválido"),
    status: z.enum(validStatuses).default('present'),
    notes: z.string().optional().nullable()
  })
});

export const scanRecordSchema = z.object({
  body: z.object({
    qrCode: z.string().min(1, "El código QR es obligatorio")
  })
});

export const updateRecordSchema = z.object({
  body: z.object({
    status: z.enum(validStatuses).optional(),
    notes: z.string().optional().nullable()
  })
});