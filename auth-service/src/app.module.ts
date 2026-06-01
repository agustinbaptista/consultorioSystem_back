import { getTypeOrmPostgresOptions } from '@consultorio/shared';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ensureDatabaseInitialized } from './database/database-init';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        await ensureDatabaseInitialized(config);
        return getTypeOrmPostgresOptions({
          databaseUrl: config.get<string>('DATABASE_URL'),
          schema: 'app_auth',
          entities: [User],
          synchronize: config.get('NODE_ENV') === 'development',
          logging: config.get('NODE_ENV') === 'development',
        });
      },
    }),
    HealthModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
