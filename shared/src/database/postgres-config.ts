import { getPgSsl } from './pg-ssl';

/** Compatibilidad pg v8 + Supabase (evita verify-full y SELF_SIGNED_CERT_IN_CHAIN) */
export function normalizeDatabaseUrl(databaseUrl: string): string {
  if (!databaseUrl) return databaseUrl;
  if (
    databaseUrl.includes('sslmode=require') &&
    !databaseUrl.includes('uselibpqcompat')
  ) {
    return `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}uselibpqcompat=true`;
  }
  return databaseUrl;
}

export interface TypeOrmPostgresOptionsInput {
  databaseUrl?: string;
  schema: string;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  entities: Function[];
  synchronize?: boolean;
  logging?: boolean;
}

/** Opciones TypeORM listas para Supabase / PostgreSQL remoto */
export function getTypeOrmPostgresOptions(input: TypeOrmPostgresOptionsInput) {
  const url = normalizeDatabaseUrl(input.databaseUrl ?? '');
  const ssl = getPgSsl(url);

  return {
    type: 'postgres' as const,
    url,
    schema: input.schema,
    entities: input.entities,
    synchronize: input.synchronize ?? false,
    logging: input.logging ?? false,
    ...(ssl ? { ssl } : {}),
  };
}
