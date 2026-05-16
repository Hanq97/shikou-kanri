import { z } from 'zod';
import i18n from '@/shared/i18n';

const PROJECT_TYPES = ['new_construction', 'remodel', 'repair', 'aftercare'] as const;

export const ProjectSchema = z
  .object({
    preAcquisition: z.boolean().default(false),
    customerId: z.string().uuid().optional().or(z.literal('')),
    propertyId: z.string().uuid().optional().or(z.literal('')),
    projectType: z.enum(PROJECT_TYPES),
    name: z.string().max(200),
    description: z.string().max(5000).optional().or(z.literal('')),
    ownerUserId: z.string().uuid(),
    scheduleStart: z.string().optional().or(z.literal('')),
    scheduleEnd: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const t = i18n.t.bind(i18n);
    if (!data.name || data.name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('project.errors.nameRequired'),
        path: ['name'],
      });
    }
    if (!data.preAcquisition && (!data.customerId || data.customerId === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('project.errors.customerRequired'),
        path: ['customerId'],
      });
    }
    if (data.scheduleStart && data.scheduleEnd && data.scheduleStart > data.scheduleEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('project.errors.scheduleRangeInvalid'),
        path: ['scheduleEnd'],
      });
    }
  });

export type ProjectFormValues = z.infer<typeof ProjectSchema>;
