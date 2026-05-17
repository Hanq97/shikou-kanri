import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { ProjectTypeName } from '../domain/types';

export class UpdateProjectDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string | null;

  @IsOptional()
  @IsEnum(['new_construction', 'remodel', 'repair', 'aftercare'])
  projectType?: ProjectTypeName;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsDateString()
  scheduleStart?: string | null;

  @IsOptional()
  @IsDateString()
  scheduleEnd?: string | null;
}
