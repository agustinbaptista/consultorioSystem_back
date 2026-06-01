import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { buildPaginationMeta, normalizePagination } from '@consultorio/shared';
import { Repository } from 'typeorm';
import { Branch } from '../../entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(@InjectRepository(Branch) private readonly repo: Repository<Branch>) {}

  private toDto(b: Branch) {
    return {
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone,
      isActive: b.isActive,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  async findAll(page?: number, limit?: number) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const [items, total] = await this.repo.findAndCount({
      skip,
      take: l,
      order: { name: 'ASC' },
    });
    return { data: items.map((b) => this.toDto(b)), meta: buildPaginationMeta(p, l, total) };
  }

  async findOne(id: string) {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Sede no encontrada');
    return { data: this.toDto(b) };
  }

  async create(dto: CreateBranchDto) {
    const saved = await this.repo.save(this.repo.create(dto));
    return { data: this.toDto(saved) };
  }

  async update(id: string, dto: UpdateBranchDto) {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Sede no encontrada');
    Object.assign(b, dto);
    const saved = await this.repo.save(b);
    return { data: this.toDto(saved) };
  }

  async remove(id: string) {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Sede no encontrada');
    await this.repo.softRemove(b);
    return { data: { id, deleted: true } };
  }
}
