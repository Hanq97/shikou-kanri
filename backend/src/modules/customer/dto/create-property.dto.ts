import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @Length(36, 36)
  customerId!: string;

  @IsString()
  @Length(1, 2000)
  address!: string;

  @IsEnum([
    'new_construction',
    'remodel',
    'single_family',
    'multi_family',
    'commercial',
    'other',
  ])
  propertyType!:
    | 'new_construction'
    | 'remodel'
    | 'single_family'
    | 'multi_family'
    | 'commercial'
    | 'other';

  @IsEnum(['wood', 'steel', 'rc', 'other'])
  structure!: 'wood' | 'steel' | 'rc' | 'other';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearBuilt?: number;

  @IsOptional()
  @IsDateString()
  handoverDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999.99)
  floorAreaSqm?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  photoUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
