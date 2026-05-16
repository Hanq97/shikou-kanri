import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'メールアドレスの形式が正しくありません' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(1, { message: 'パスワードを入力してください' })
  @MaxLength(256)
  password!: string;
}
