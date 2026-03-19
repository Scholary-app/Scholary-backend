import { z } from 'zod';

export const enrollStudentsSchema = z.object({
  body: z.object({
    studentIds: z.array(
      z.string().uuid("Cada ID de estudiante debe ser un UUID válido")
    ).min(1, "Debes enviar al menos un estudiante para inscribir")
  })
});