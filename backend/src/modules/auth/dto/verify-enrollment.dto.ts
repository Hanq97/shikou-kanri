import { IsString, Length } from 'class-validator';

export class VerifyEnrollmentDto {
  @IsString()
  @Length(6, 6, { message: '6桁の認証コードを入力してください' })
  code!: string;
}
