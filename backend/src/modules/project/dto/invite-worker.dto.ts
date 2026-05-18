import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteWorkerDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
