import { z } from 'zod';

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('メールアドレスの形式が正しくありません'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;
