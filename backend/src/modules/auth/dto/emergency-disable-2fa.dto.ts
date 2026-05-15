import { IsString, MaxLength, MinLength } from 'class-validator';

export class EmergencyDisable2FaDto {
  @IsString()
  @MinLength(10, { message: '理由を10文字以上で記入してください' })
  @MaxLength(500)
  reason!: string;
}
