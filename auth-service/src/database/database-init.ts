import { bootstrapDatabase, resolveDatabaseUrlForInit } from '@consultorio/shared';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('DatabaseInit');

let initialized = false;

/** Idempotente: corre una sola vez por proceso */
export async function ensureDatabaseInitialized(
  config: ConfigService,
): Promise<void> {
  if (initialized) return;
  if (config.get('DB_AUTO_INIT', 'true') === 'false') {
    logger.log('DB_AUTO_INIT=false — se omite init-db.sql');
    initialized = true;
    return;
  }

  const url = resolveDatabaseUrlForInit(
    config.get<string>('DATABASE_URL_DIRECT'),
    config.get<string>('DATABASE_URL'),
  );

  logger.log('Ejecutando init-db.sql (schemas, tablas, seeds)...');
  await bootstrapDatabase(url);
  initialized = true;
}
