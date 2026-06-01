import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AppointmentStatus,
  PaymentStatus,
  buildPaginationMeta,
  normalizePagination,
} from '@consultorio/shared';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Appointment } from '../../entities/appointment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly repo: Repository<Appointment>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  private toDto(a: Appointment) {
    return {
      id: a.id,
      patientId: a.patientId,
      professionalId: a.professionalId,
      branchId: a.branchId,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      paymentStatus: a.paymentStatus,
      attendanceStatus: a.attendanceStatus,
      description: a.description,
      cancelReason: a.cancelReason,
      cancelledBy: a.cancelledBy,
      cancelledAt: a.cancelledAt,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  async findAll(filters: {
    from?: string;
    to?: string;
    branchId?: string;
    professionalId?: string;
    patientId?: string;
    page?: number;
    limit?: number;
  }) {
    const { page: p, limit: l, skip } = normalizePagination(filters.page, filters.limit);
    const qb = this.repo.createQueryBuilder('a').orderBy('a.startAt', 'ASC');
    if (filters.from) qb.andWhere('a.startAt >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('a.startAt <= :to', { to: filters.to });
    if (filters.branchId) qb.andWhere('a.branchId = :branchId', { branchId: filters.branchId });
    if (filters.professionalId) {
      qb.andWhere('a.professionalId = :professionalId', {
        professionalId: filters.professionalId,
      });
    }
    if (filters.patientId) qb.andWhere('a.patientId = :patientId', { patientId: filters.patientId });
    qb.skip(skip).take(l);
    const [items, total] = await qb.getManyAndCount();
    return { data: items.map((x) => this.toDto(x)), meta: buildPaginationMeta(p, l, total) };
  }

  async findByPatient(patientId: string) {
    const items = await this.repo.find({
      where: { patientId },
      order: { startAt: 'DESC' },
    });
    return { data: items.map((x) => this.toDto(x)) };
  }

  async findOne(id: string) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Turno no encontrado');
    return { data: this.toDto(a) };
  }

  private async getProfessionalSlotMinutes(professionalId: string): Promise<number> {
    const base = this.config.get('PROFESSIONALS_SERVICE_URL');
    const key = this.config.get('INTERNAL_API_KEY');
    const { data } = await firstValueFrom(
      this.http.get(`${base}/internal/professionals/${professionalId}`, {
        headers: { 'X-Internal-Service-Key': key },
      }),
    );
    return data?.data?.defaultSlotMinutes ?? 30;
  }

  private async assertSlotAvailable(
    professionalId: string,
    branchId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ) {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.professionalId = :professionalId', { professionalId })
      .andWhere('a.branchId = :branchId', { branchId })
      .andWhere('a.status != :cancelled', { cancelled: AppointmentStatus.CANCELADO })
      .andWhere('a.startAt < :endAt', { endAt })
      .andWhere('a.endAt > :startAt', { startAt });
    if (excludeId) qb.andWhere('a.id != :excludeId', { excludeId });
    const overlap = await qb.getOne();
    if (overlap) {
      throw new ConflictException('El horario seleccionado no está disponible');
    }

    const date = startAt.toISOString().slice(0, 10);
    const base = this.config.get('PROFESSIONALS_SERVICE_URL');
    const key = this.config.get('INTERNAL_API_KEY');
    const { data } = await firstValueFrom(
      this.http.get(`${base}/internal/availability`, {
        params: { professionalId, branchId, date },
        headers: { 'X-Internal-Service-Key': key },
      }),
    );
    const startTime = startAt.toTimeString().slice(0, 5);
    const slot = data?.slots?.find(
      (s: { start: string; available: boolean }) => s.start === startTime,
    );
    if (slot && slot.available === false) {
      throw new ConflictException('El horario no está dentro de la agenda del profesional');
    }
  }

  async create(dto: CreateAppointmentDto, createdBy?: string) {
    const startAt = new Date(dto.startAt);
    const slotMinutes = await this.getProfessionalSlotMinutes(dto.professionalId);
    const endAt = new Date(startAt.getTime() + slotMinutes * 60_000);
    await this.assertSlotAvailable(dto.professionalId, dto.branchId, startAt, endAt);

    const saved = await this.repo.save(
      this.repo.create({
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        branchId: dto.branchId,
        startAt,
        endAt,
        status: AppointmentStatus.PROGRAMADO,
        paymentStatus: PaymentStatus.PENDIENTE,
        description: dto.description ?? null,
        createdBy: createdBy ?? null,
      }),
    );

    await this.notifications.emitAppointmentEvent('appointment.created', saved, createdBy);

    return { data: this.toDto(saved) };
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Turno no encontrado');
    if (dto.startAt) {
      const startAt = new Date(dto.startAt);
      const slotMinutes = await this.getProfessionalSlotMinutes(a.professionalId);
      const endAt = new Date(startAt.getTime() + slotMinutes * 60_000);
      await this.assertSlotAvailable(a.professionalId, a.branchId, startAt, endAt, id);
      a.startAt = startAt;
      a.endAt = endAt;
    }
    if (dto.status) a.status = dto.status;
    if (dto.attendanceStatus !== undefined) a.attendanceStatus = dto.attendanceStatus;
    if (dto.description !== undefined) a.description = dto.description;
    const saved = await this.repo.save(a);
    await this.notifications.emitAppointmentEvent('appointment.updated', saved);
    return { data: this.toDto(saved) };
  }

  async cancel(id: string, dto: CancelAppointmentDto, cancelledBy?: string) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Turno no encontrado');
    a.status = AppointmentStatus.CANCELADO;
    a.cancelReason = dto.cancelReason;
    a.cancelledBy = cancelledBy ?? null;
    a.cancelledAt = new Date();
    const saved = await this.repo.save(a);
    await this.notifications.emitAppointmentEvent('appointment.cancelled', saved, cancelledBy);
    return { data: this.toDto(saved) };
  }

  async updatePayment(id: string, dto: UpdatePaymentDto) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Turno no encontrado');
    a.paymentStatus = dto.paymentStatus;
    const saved = await this.repo.save(a);
    await this.notifications.emitAppointmentEvent('payment.updated', saved);
    return { data: this.toDto(saved) };
  }

  async remove(id: string) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Turno no encontrado');
    await this.repo.softRemove(a);
    return { data: { id, deleted: true } };
  }
}
