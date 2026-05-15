import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: '現在のパスワードを入力してください' })
  @MaxLength(256)
  oldPassword!: string;

  @IsString()
  @MinLength(12, { message: '12文字以上必要です' })
  @MaxLength(256)
  newPassword!: string;
}
