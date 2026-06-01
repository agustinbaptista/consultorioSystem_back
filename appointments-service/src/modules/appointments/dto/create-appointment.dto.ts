import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  professionalId!: string;

  @IsUUID()
  branchId!: string;

  @IsISO8601()
  startAt!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
