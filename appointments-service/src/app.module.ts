import { getTypeOrmPostgresOptions } from '@consultorio/shared';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { Notification } from './entities/notification.entity';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        getTypeOrmPostgresOptions({
          databaseUrl: config.get<string>('DATABASE_URL'),
          schema: 'appointments',
          entities: [Appointment, Notification],
          synchronize: config.get('NODE_ENV') === 'development',
        }),
    }),
    HealthModule,
    AppointmentsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
