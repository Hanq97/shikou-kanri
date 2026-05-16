import { IsBoolean, IsString, Length } from 'class-validator';

export class Verify2FaDto {
  @IsString()
  @Length(1, 2048)
  intermediateToken!: string;

  @IsString()
  @Length(6, 12)
  code!: string;

  @IsBoolean()
  useBackupCode!: boolean;
}
