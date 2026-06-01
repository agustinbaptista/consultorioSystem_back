import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalApiGuard } from '../../common/guards/internal-api.guard';
import { AppointmentsService } from './appointments.service';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Controller()
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Get('appointments')
  findAll(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll({ from, to, branchId, professionalId, page, limit });
  }

  @Get('appointments/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('appointments')
  create(
    @Body() dto: CreateAppointmentDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Patch('appointments/:id')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.service.update(id, dto);
  }

  @Post('appointments/:id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.service.cancel(id, dto, userId);
  }

  @Patch('appointments/:id/payment')
  updatePayment(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.service.updatePayment(id, dto);
  }

  @Delete('appointments/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('internal/appointments/by-patient/:patientId')
  @UseGuards(InternalApiGuard)
  byPatient(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }
}
