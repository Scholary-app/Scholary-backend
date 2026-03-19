import { z } from 'zod';

// Expresión regular para validar formato 24 horas (ej. 08:30, 23:15)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const createScheduleSchema = z.object({
  body: z.object({
    dayOfWeek: z.enum(daysOfWeek, { 
      errorMap: () => ({ message: "El día debe ser válido (Ej. Lunes, Martes... con mayúscula inicial)" }) 
    }),
    startTime: z.string().regex(timeRegex, "El formato de hora de inicio debe ser HH:MM"),
    endTime: z.string().regex(timeRegex, "El formato de hora de fin debe ser HH:MM"),
    classroom: z.string().max(100).optional().nullable()
  }).refine((data) => {
    // Validar que endTime > startTime (al estar en 24h, una simple comparación de strings funciona)
    return data.startTime < data.endTime;
  }, {
    message: "La hora de fin debe ser estrictamente posterior a la hora de inicio",
    path: ["endTime"]
  })
});

export const updateScheduleSchema = z.object({
  body: z.object({
    dayOfWeek: z.enum(daysOfWeek).optional(),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
    classroom: z.string().max(100).optional().nullable(),
    active: z.boolean().optional()
  }).refine((data) => {
    // Solo validamos si ambas horas vienen en la petición
    if (data.startTime && data.endTime) {
      return data.startTime < data.endTime;
    }
    return true;
  }, {
    message: "La hora de fin debe ser estrictamente posterior a la hora de inicio",
    path: ["endTime"]
  })
});