import { z } from 'zod';

export const PasswordSchema = z
  .string()
  .min(12, '12文字以上必要です')
  .max(256)
  .regex(/[A-Z]/, '大文字を含める必要があります')
  .regex(/[a-z]/, '小文字を含める必要があります')
  .regex(/[0-9]/, '数字を含める必要があります')
  .regex(/[^A-Za-z0-9]/, '記号を含める必要があります');

export const ResetPasswordSchema = z
  .object({
    password: PasswordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'パスワードが一致しません',
    path: ['passwordConfirm'],
  });

export const AcceptInviteSchema = ResetPasswordSchema;

export type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;
