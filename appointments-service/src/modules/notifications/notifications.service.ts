import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { buildPaginationMeta, normalizePagination } from '@consultorio/shared';
import { Repository } from 'typeorm';
import { Appointment } from '../../entities/appointment.entity';
import { Notification } from '../../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
  ) {}

  private toDto(n: Notification) {
    return {
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      entityType: n.entityType,
      entityId: n.entityId,
      isRead: n.isRead,
      createdAt: n.createdAt,
    };
  }

  async findForUser(userId: string, unreadOnly?: boolean, page?: number, limit?: number) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC');
    if (unreadOnly === true || unreadOnly === 'true' as unknown) {
      qb.andWhere('n.isRead = false');
    }
    qb.skip(skip).take(l);
    const [items, total] = await qb.getManyAndCount();
    return { data: items.map((n) => this.toDto(n)), meta: buildPaginationMeta(p, l, total) };
  }

  async markRead(id: string, userId: string) {
    const n = await this.repo.findOne({ where: { id, userId } });
    if (!n) return { data: null };
    n.isRead = true;
    await this.repo.save(n);
    return { data: this.toDto(n) };
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
    return { data: { success: true } };
  }

  async emitAppointmentEvent(
    type: string,
    appointment: Appointment,
    actorUserId?: string,
  ) {
    const titleMap: Record<string, string> = {
      'appointment.created': 'Nuevo turno',
      'appointment.cancelled': 'Turno cancelado',
      'appointment.updated': 'Turno actualizado',
      'payment.updated': 'Estado de pago actualizado',
    };
    const title = titleMap[type] || 'Notificación';
    const body = `Turno ${appointment.id.slice(0, 8)} — ${new Date(appointment.startAt).toLocaleString('es-AR')}`;

    const targets = new Set<string>();
    if (actorUserId) targets.add(actorUserId);
    if (appointment.createdBy) targets.add(appointment.createdBy);

    if (targets.size === 0) {
      await this.repo.save(
        this.repo.create({
          userId: actorUserId || '00000000-0000-0000-0000-000000000001',
          type,
          title,
          body,
          entityType: 'appointment',
          entityId: appointment.id,
        }),
      );
      return;
    }

    for (const userId of targets) {
      await this.repo.save(
        this.repo.create({
          userId,
          type,
          title,
          body,
          entityType: 'appointment',
          entityId: appointment.id,
        }),
      );
    }
  }
}
