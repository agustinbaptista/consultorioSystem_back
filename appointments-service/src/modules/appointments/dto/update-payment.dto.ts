import { PaymentStatus } from '@consultorio/shared';
import { IsEnum } from 'class-validator';

export class UpdatePaymentDto {
  @IsEnum(PaymentStatus)
  paymentStatus!: PaymentStatus;
}
