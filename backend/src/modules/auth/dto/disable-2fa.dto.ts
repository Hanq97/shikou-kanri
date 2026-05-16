import {
  IsBoolean,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class Disable2FaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;

  @IsString()
  @Length(6, 12)
  code!: string;

  @IsBoolean()
  useBackupCode!: boolean;
}
