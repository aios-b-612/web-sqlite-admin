/** URL do web-account (Minha conta). Preferir account_url do GET /account quando mapeado. */
export function resolveAccountAppUrl(
  accountUrl?: string | null,
  apps?: Array<{ id?: string; href?: string }> | null,
): string {
  const fromField = typeof accountUrl === "string" ? accountUrl.trim() : ""
  if (fromField) return fromField
  const fromApps = apps?.find((a) => a?.id === "account")?.href?.trim()
  if (fromApps) return fromApps
  const fromEnv = String(process.env.NEXT_PUBLIC_ACCOUNT_APP_URL ?? "").trim()
  if (fromEnv) return fromEnv
  const menuEnv = String(process.env.NEXT_PUBLIC_APP_MENU_ENV ?? "")
    .trim()
    .toLowerCase()
  if (menuEnv === "local") return "http://localhost:5175"
  if (menuEnv === "homolog") return "http://10.8.0.9:15180"
  return "https://conta.octor.com.br"
}
