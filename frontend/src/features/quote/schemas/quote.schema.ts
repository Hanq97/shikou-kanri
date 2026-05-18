import { z } from 'zod';
import i18n from '@/shared/i18n';

export const QuoteLineSchema = z.object({
  category: z.string().max(50).optional().or(z.literal('')),
  itemName: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  unit: z.string().min(1).max(20),
  quantity: z.number().min(0),
  unitPrice: z.number().int().min(0),
  taxRate: z.number().min(0).max(1),
  isOptional: z.boolean().default(false),
  unitPriceMasterId: z.string().uuid().optional().or(z.literal('')),
});

export const QuoteFormSchema = z
  .object({
    projectId: z.string().uuid(),
    issuedAt: z.string().min(1),
    validUntil: z.string().optional().or(z.literal('')),
    notes: z.string().max(5000).optional().or(z.literal('')),
    qualifiedInvoiceNumber: z.string().max(20).optional().or(z.literal('')),
    lines: z.array(QuoteLineSchema),
  })
  .superRefine((data, ctx) => {
    const t = i18n.t.bind(i18n);

    const requiredCount = data.lines.filter((l) => !l.isOptional).length;
    if (requiredCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('quote.errors.atLeastOneRequiredLine'),
        path: ['lines'],
      });
    }

    if (data.validUntil && data.issuedAt && data.validUntil < data.issuedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('quote.errors.validUntilBeforeIssued'),
        path: ['validUntil'],
      });
    }
  });

export type QuoteLineFormValues = z.infer<typeof QuoteLineSchema>;
export type QuoteFormValues = z.infer<typeof QuoteFormSchema>;
