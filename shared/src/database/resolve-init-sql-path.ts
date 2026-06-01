import { existsSync } from 'fs';
import { join } from 'path';

/** Ubica init-db.sql desde la raíz backend o un microservicio */
export function resolveInitSqlPath(): string {
  const candidates = [
    join(process.cwd(), 'scripts', 'init-db.sql'),
    join(process.cwd(), '..', 'scripts', 'init-db.sql'),
    join(__dirname, '..', '..', '..', 'scripts', 'init-db.sql'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      `No se encontró init-db.sql. Rutas probadas: ${candidates.join(', ')}`,
    );
  }
  return found;
}
