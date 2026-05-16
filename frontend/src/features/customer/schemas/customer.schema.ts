import { z } from 'zod';
import i18n from '@/shared/i18n';

export const CustomerSchema = z
  .object({
    customerType: z.enum(['individual', 'corporate']),
    name: z.string().max(200),
    nameKana: z.string().max(200).optional().or(z.literal('')),
    phone: z.string().max(20).optional().or(z.literal('')),
    email: z.string().max(255).optional().or(z.literal('')),
    address: z.string().max(2000).optional().or(z.literal('')),
    isOb: z.boolean().default(false),
    acquiredAt: z.string().optional().or(z.literal('')),
    notes: z.string().max(5000).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const t = i18n.t.bind(i18n);
    if (!data.name || data.name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('customer.errors.nameRequired'),
        path: ['name'],
      });
    }
    if (data.phone && data.phone.length > 0 && !/^[\d\-\s()()　]+$/u.test(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('customer.errors.phoneInvalid'),
        path: ['phone'],
      });
    }
    if (data.email && data.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('customer.errors.emailInvalid'),
        path: ['email'],
      });
    }
  });

export type CustomerFormValues = z.infer<typeof CustomerSchema>;
