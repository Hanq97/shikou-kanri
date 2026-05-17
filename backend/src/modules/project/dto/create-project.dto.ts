import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ProjectTypeName } from '../domain/types';

export class CreateProjectDto {
  @ValidateIf((o: CreateProjectDto) => !o.preAcquisition)
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsEnum(['new_construction', 'remodel', 'repair', 'aftercare'])
  projectType!: ProjectTypeName;

  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsUUID()
  ownerUserId!: string;

  @IsOptional()
  @IsDateString()
  scheduleStart?: string;

  @IsOptional()
  @IsDateString()
  scheduleEnd?: string;

  @IsOptional()
  @IsBoolean()
  preAcquisition?: boolean;
}
