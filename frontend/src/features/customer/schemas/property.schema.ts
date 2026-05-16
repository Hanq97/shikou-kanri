import { z } from 'zod';
import i18n from '@/shared/i18n';

export const PropertySchema = z
  .object({
    address: z.string().max(2000),
    propertyType: z.enum([
      'new_construction',
      'remodel',
      'single_family',
      'multi_family',
      'commercial',
      'other',
    ]),
    structure: z.enum(['wood', 'steel', 'rc', 'other']),
    yearBuilt: z.number().int().min(1900).max(2100).optional().nullable(),
    handoverDate: z.string().optional().or(z.literal('')),
    floorAreaSqm: z.number().min(0).max(99999.99).optional().nullable(),
    photoUrls: z.array(z.string()).max(3).default([]),
    notes: z.string().max(2000).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const t = i18n.t.bind(i18n);
    if (!data.address || data.address.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('property.errors.addressRequired'),
        path: ['address'],
      });
    }
  });

export type PropertyFormValues = z.infer<typeof PropertySchema>;
