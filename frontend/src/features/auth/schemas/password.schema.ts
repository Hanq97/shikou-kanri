import { z } from 'zod';
import i18n from '@/shared/i18n';

/**
 * Password policy: 12+ chars + upper + lower + digit + symbol.
 * Uses superRefine so error messages are translated via i18n.t() at validation time
 * (Zod's .min/.regex message field does not accept a function).
 */
export const PasswordSchema = z
  .string()
  .max(256)
  .superRefine((val, ctx) => {
    const t = i18n.t.bind(i18n);
    if (val.length < 12) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('auth.errors.passwordLength') });
      return;
    }
    if (!/[A-Z]/.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('auth.errors.passwordUpper') });
    }
    if (!/[a-z]/.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('auth.errors.passwordLower') });
    }
    if (!/[0-9]/.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('auth.errors.passwordDigit') });
    }
    if (!/[^A-Za-z0-9]/.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('auth.errors.passwordSymbol') });
    }
  });

export const ResetPasswordSchema = z
  .object({
    password: PasswordSchema,
    passwordConfirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n.t('auth.errors.passwordPolicy'),
        path: ['passwordConfirm'],
      });
    }
  });

export const AcceptInviteSchema = ResetPasswordSchema;

export const ChangePasswordSchema = z
  .object({
    oldPassword: z.string(),
    password: PasswordSchema,
    passwordConfirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.oldPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n.t('auth.errors.oldPasswordRequired'),
        path: ['oldPassword'],
      });
    }
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n.t('auth.errors.passwordPolicy'),
        path: ['passwordConfirm'],
      });
    }
  });

export type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordFormValues = z.infer<typeof ChangePasswordSchema>;
