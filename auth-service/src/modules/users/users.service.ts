import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '@consultorio/shared';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectRepository(User) private readonly usersRepo: Repository<User>) {}

  async onModuleInit() {
    try {
      const count = await this.usersRepo.count();
      if (count === 0) {
        this.logger.log('No users found in database. Seeding initial admin user...');
        const passwordHash = await bcrypt.hash('admin123', 10);
        const adminUser = this.usersRepo.create({
          email: 'admin@consultorio.com',
          passwordHash,
          role: 'admin' as Role,
          isActive: true,
        });
        await this.usersRepo.save(adminUser);
        this.logger.log('Initial admin user seeded successfully: admin@consultorio.com / admin123');
      }
    } catch (e) {
      this.logger.error('Failed to seed initial user:', e);
    }
  }

  async createInternal(dto: CreateUserDto) {
    const existing = await this.usersRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role,
      employeeId: dto.employeeId,
      isActive: true,
    });
    const saved = await this.usersRepo.save(user);
    return {
      data: {
        id: saved.id,
        email: saved.email,
        role: saved.role,
        employeeId: saved.employeeId,
      },
    };
  }

  async create(dto: CreateUserDto) {
    return this.createInternal(dto);
  }

  async findById(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return {
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        isActive: user.isActive,
      },
    };
  }
}
