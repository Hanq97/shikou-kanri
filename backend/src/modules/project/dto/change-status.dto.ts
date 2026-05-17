import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ProjectStatusName } from '../domain/types';

const FORWARD_STATUSES: ProjectStatusName[] = [
  'received',
  'construction',
  'completed',
  'handed_over',
  'cancelled',
];

export class ChangeStatusDto {
  @IsEnum(FORWARD_STATUSES)
  status!: ProjectStatusName;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(999_999_999_999_999)
  amountTotal?: number;

  @IsOptional()
  @IsString()
  @Length(5, 1000)
  reason?: string;
}
