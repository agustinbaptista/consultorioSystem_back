/**
 * Ejecuta init-db.sql contra DATABASE_URL.
 * Uso: npm run db:init (desde backend/)
 */
import { config } from 'dotenv';
import { join } from 'path';
import { bootstrapDatabase, resolveDatabaseUrlForInit } from '@consultorio/shared';

const root = process.cwd();
config({ path: join(root, '.env') });
config({ path: join(root, 'auth-service', '.env') });

const url = resolveDatabaseUrlForInit(
  process.env.DATABASE_URL_DIRECT,
  process.env.DATABASE_URL,
);

bootstrapDatabase(url)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[db-init] Error:', err);
    process.exit(1);
  });
