import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { buildPaginationMeta, normalizePagination } from '@consultorio/shared';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Patient } from '../../entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private readonly repo: Repository<Patient>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private toDto(p: Patient) {
    return {
      id: p.id,
      documentType: p.documentType,
      documentNumber: p.documentNumber,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      email: p.email,
      notes: p.notes,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async findAll(page?: number, limit?: number, search?: string) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const qb = this.repo.createQueryBuilder('p').orderBy('p.lastName', 'ASC');
    if (search) {
      qb.andWhere(
        '(p.firstName ILIKE :s OR p.lastName ILIKE :s OR p.documentNumber ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    qb.skip(skip).take(l);
    const [items, total] = await qb.getManyAndCount();
    return { data: items.map((x) => this.toDto(x)), meta: buildPaginationMeta(p, l, total) };
  }

  async findOne(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    return { data: this.toDto(p) };
  }

  async create(dto: CreatePatientDto) {
    const exists = await this.repo.findOne({
      where: {
        documentType: dto.documentType || 'DNI',
        documentNumber: dto.documentNumber,
      },
    });
    if (exists) throw new ConflictException('Ya existe un paciente con ese documento');
    const saved = await this.repo.save(
      this.repo.create({
        documentType: dto.documentType || 'DNI',
        documentNumber: dto.documentNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
      }),
    );
    return { data: this.toDto(saved) };
  }

  async update(id: string, dto: UpdatePatientDto) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    Object.assign(p, dto);
    const saved = await this.repo.save(p);
    return { data: this.toDto(saved) };
  }

  async remove(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    await this.repo.softRemove(p);
    return { data: { id, deleted: true } };
  }

  async getAppointments(patientId: string) {
    const p = await this.repo.findOne({ where: { id: patientId } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    const url = this.config.get('APPOINTMENTS_SERVICE_URL');
    const key = this.config.get('INTERNAL_API_KEY');
    const { data } = await firstValueFrom(
      this.http.get(`${url}/internal/appointments/by-patient/${patientId}`, {
        headers: { 'X-Internal-Service-Key': key },
      }),
    );
    return data;
  }
}
