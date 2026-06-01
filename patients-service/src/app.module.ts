import { getTypeOrmPostgresOptions } from '@consultorio/shared';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { HealthModule } from './modules/health/health.module';
import { PatientsModule } from './modules/patients/patients.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        getTypeOrmPostgresOptions({
          databaseUrl: config.get<string>('DATABASE_URL'),
          schema: 'patients',
          entities: [Patient],
          synchronize: config.get('NODE_ENV') === 'development',
        }),
    }),
    HealthModule,
    PatientsModule,
  ],
})
export class AppModule {}
