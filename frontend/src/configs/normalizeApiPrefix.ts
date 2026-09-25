/**
 * Em produção, NEXT_PUBLIC_API_URL deve ser origem (sem sufixo /v1|/v2).
 */
export function normalizeApiPrefix(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return '/api'
  if (trimmed.startsWith('/')) return trimmed
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const u = new URL(withProtocol)
    let pathname = u.pathname.replace(/\/+$/, '')
    while (pathname.endsWith('/v1') || pathname.endsWith('/v2')) {
      pathname = pathname.slice(0, -3)
    }
    pathname = pathname.replace(/\/+$/, '')
    if (!pathname) return u.origin
    return `${u.origin}${pathname}`
  } catch {
    let stripped = trimmed.replace(/\/+$/, '')
    stripped = stripped.replace(/(?:\/v1)+\/?$/i, '')
    stripped = stripped.replace(/(?:\/v2)+\/?$/i, '')
    return stripped.replace(/\/+$/, '') || '/api'
  }
}
