import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(255).optional(),
    phone: z.string().max(20).optional().nullable(),
    institution: z.string().max(255).optional().nullable(),
    avatarUrl: z.string().url().optional().nullable()
  })
});

export const updateSettingsSchema = z.object({
  body: z.object({
    lateToleranceMinutes: z.number().int().min(0).max(60).optional(),
    applyThreeStrikesRule: z.boolean().optional()
  })
});