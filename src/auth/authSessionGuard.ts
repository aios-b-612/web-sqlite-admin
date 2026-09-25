import type { AxiosError } from 'axios'

const AUTH_DENIED_MARKERS = [
  'access denied',
  'token is required',
  'invalid token format',
  'unauthorized',
  'sessão inválida',
  'sessão não encontrada',
]

function normalizeApiPath(url: string | undefined): string {
  if (!url) return ''
  return url.split('?')[0]?.split('#')[0] ?? url
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function includesAuthDeniedMarker(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  if (!normalized) return false
  return AUTH_DENIED_MARKERS.some((marker) => normalized.includes(marker))
}

export function isAuthDeniedPayload(payload: unknown): boolean {
  if (!isObjectRecord(payload) || payload.status !== false) return false
  return (
    includesAuthDeniedMarker(payload.text) ||
    includesAuthDeniedMarker(payload.message) ||
    includesAuthDeniedMarker(payload.title)
  )
}

/** Rotas de identidade SSO — 401 aqui invalida a sessão global. */
export function isAuthIdentityRequest(url: string | undefined): boolean {
  const path = normalizeApiPath(url).toLowerCase()
  if (!path) return false
  return (
    path.includes('/auth/session') ||
    path.includes('/auth/account') ||
    path.includes('/auth/introspect') ||
    path.includes('/auth/signin') ||
    path.includes('/auth/sign-in') ||
    path.endsWith('/account') ||
    path.endsWith('/v1/account')
  )
}

/**
 * Não limpar sessão em 401 genérico de API de negócio / rede / bootstrap.
 * Padrão canônico: web-stock authSessionGuard.
 */
export function shouldClearAuthSessionOnAxiosError(error: AxiosError): boolean {
  const status = error.response?.status
  if (status === undefined) return false

  const requestUrl = error.config?.url
  if (requestUrl?.includes('/auth/session')) return false
  if (isAuthDeniedPayload(error.response?.data)) return true
  if (![401, 419, 440].includes(status)) return false
  return isAuthIdentityRequest(requestUrl)
}
