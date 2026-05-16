import { IsEnum, IsString, Length } from 'class-validator';
import { ProjectStatusName } from '../domain/types';

const REVERSE_TARGETS: ProjectStatusName[] = [
  'quoting',
  'received',
  'construction',
  'completed',
];

export class ReverseStatusDto {
  @IsEnum(REVERSE_TARGETS)
  status!: ProjectStatusName;

  @IsString()
  @Length(5, 1000)
  reason!: string;
}
