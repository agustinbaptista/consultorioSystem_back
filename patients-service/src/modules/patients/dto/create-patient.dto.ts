import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePatientDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  documentType?: string;

  @IsString()
  @MaxLength(20)
  documentNumber!: string;

  @IsString()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
