import { readFileSync } from 'fs';
import { Client } from 'pg';
import { normalizeDatabaseUrl } from './postgres-config';
import { getPgSsl } from './pg-ssl';
import { resolveInitSqlPath } from './resolve-init-sql-path';

/** Divide el SQL ignorando comentarios de línea */
export function splitSqlStatements(sql: string): string[] {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function runInitSql(databaseUrl: string, sqlContent?: string): Promise<void> {
  const sql = sqlContent ?? readFileSync(resolveInitSqlPath(), 'utf8');
  const connectionString = normalizeDatabaseUrl(databaseUrl);
  const ssl = getPgSsl(databaseUrl);
  const client = new Client({
    connectionString,
    ...(ssl ? { ssl } : {}),
  });

  await client.connect();
  const statements = splitSqlStatements(sql);

  try {
    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Extensiones opcionales o objetos ya existentes
        if (
          msg.includes('already exists') ||
          msg.includes('duplicate key') ||
          msg.includes('btree_gist')
        ) {
          console.warn(`[db-init] Omitido: ${msg.slice(0, 120)}`);
          continue;
        }
        throw err;
      }
    }
    console.log('[db-init] PostgreSQL inicializado (schemas, tablas, seeds)');
  } finally {
    await client.end();
  }
}

/** Prefiere conexión directa (DDL/schemas en Supabase) */
export function resolveDatabaseUrlForInit(
  directUrl?: string,
  pooledUrl?: string,
): string {
  const url = directUrl || pooledUrl;
  if (!url) {
    throw new Error('[db-init] DATABASE_URL o DATABASE_URL_DIRECT requerida');
  }
  return url;
}

export async function bootstrapDatabase(databaseUrl: string): Promise<void> {
  if (!databaseUrl) {
    throw new Error('[db-init] DATABASE_URL no está definida');
  }
  await runInitSql(databaseUrl);
}
