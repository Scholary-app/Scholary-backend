import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // Formato estricto YYYY-MM-DD
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // Formato HH:MM

export const createSessionSchema = z.object({
  body: z.object({
    sessionDate: z.string().regex(dateRegex, "El formato de fecha debe ser YYYY-MM-DD"),
    sessionTime: z.string().regex(timeRegex, "El formato de hora debe ser HH:MM").optional().nullable(),
    method: z.enum(['manual', 'qr'], { 
      errorMap: () => ({ message: "El método debe ser 'manual' o 'qr'" }) 
    }),
    notes: z.string().optional().nullable()
  })
});

export const updateSessionSchema = z.object({
  body: z.object({
    status: z.enum(['in_progress', 'completed', 'cancelled'], {
      errorMap: () => ({ message: "Status inválido" })
    }).optional(),
    notes: z.string().optional().nullable()
  })
});