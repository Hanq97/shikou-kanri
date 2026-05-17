import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUnitPriceDto {
  @IsString()
  @Length(1, 30)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsString()
  @Length(1, 200)
  itemName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @Length(1, 20)
  unit!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  defaultUnitPrice!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string;
}
