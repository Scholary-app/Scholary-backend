import { z } from 'zod';

export const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(255),
    subject: z.string().max(255).optional().nullable(),
    group: z.string().max(50).optional().nullable(),
    description: z.string().optional().nullable(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#7C3AED')
  })
});

export const updateClassSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(255).optional(),
    subject: z.string().max(255).optional().nullable(),
    group: z.string().max(50).optional().nullable(),
    description: z.string().optional().nullable(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    active: z.boolean().optional()
  })
});