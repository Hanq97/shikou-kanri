import { IsEnum } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}
