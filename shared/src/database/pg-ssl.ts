/** SSL requerido por Supabase / hosts en la nube (certificados gestionados) */
export function getPgSsl(
  databaseUrl?: string,
): { rejectUnauthorized: boolean } | undefined {
  if (!databaseUrl) return undefined;
  const needsSsl =
    databaseUrl.includes('supabase') ||
    databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('ssl=true') ||
    databaseUrl.includes('pooler.supabase.com');
  // rejectUnauthorized: false evita SELF_SIGNED_CERT_IN_CHAIN con Supabase en Node
  return needsSsl ? { rejectUnauthorized: false } : undefined;
}
