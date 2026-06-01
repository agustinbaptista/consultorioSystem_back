import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { buildPaginationMeta, normalizePagination } from '@consultorio/shared';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Employee } from '../../entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private readonly repo: Repository<Employee>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private toDto(e: Employee) {
    return {
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      document: e.document,
      phone: e.phone,
      branchId: e.branchId,
      isActive: e.isActive,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  async findAll(page?: number, limit?: number, branchId?: string) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const qb = this.repo.createQueryBuilder('e').orderBy('e.lastName', 'ASC');
    if (branchId) qb.andWhere('e.branchId = :branchId', { branchId });
    qb.skip(skip).take(l);
    const [items, total] = await qb.getManyAndCount();
    return { data: items.map((e) => this.toDto(e)), meta: buildPaginationMeta(p, l, total) };
  }

  async findOne(id: string) {
    const e = await this.repo.findOne({ where: { id }, relations: ['branch'] });
    if (!e) throw new NotFoundException('Empleado no encontrado');
    return { data: this.toDto(e) };
  }

  async create(dto: CreateEmployeeDto) {
    const employee = await this.repo.save(
      this.repo.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        document: dto.document,
        phone: dto.phone,
        branchId: dto.branchId,
        isActive: true,
      }),
    );

    const authUrl = this.config.get<string>('AUTH_SERVICE_URL');
    const internalKey = this.config.get<string>('INTERNAL_API_KEY');
    try {
      await firstValueFrom(
        this.http.post(
          `${authUrl}/internal/users`,
          {
            email: dto.email,
            password: dto.password,
            role: dto.role,
            employeeId: employee.id,
          },
          { headers: { 'X-Internal-Service-Key': internalKey } },
        ),
      );
    } catch (err: unknown) {
      await this.repo.delete(employee.id);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Error al crear usuario de acceso';
      throw new BadRequestException(message);
    }

    return { data: this.toDto(employee) };
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Empleado no encontrado');
    Object.assign(e, dto);
    const saved = await this.repo.save(e);
    return { data: this.toDto(saved) };
  }

  async remove(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Empleado no encontrado');
    await this.repo.softRemove(e);
    return { data: { id, deleted: true } };
  }
}
