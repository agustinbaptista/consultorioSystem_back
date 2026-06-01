import { getTypeOrmPostgresOptions } from '@consultorio/shared';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { Employee } from './entities/employee.entity';
import { BranchesModule } from './modules/branches/branches.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        getTypeOrmPostgresOptions({
          databaseUrl: config.get<string>('DATABASE_URL'),
          schema: 'employees',
          entities: [Branch, Employee],
          synchronize: config.get('NODE_ENV') === 'development',
        }),
    }),
    HealthModule,
    BranchesModule,
    EmployeesModule,
  ],
})
export class AppModule {}
