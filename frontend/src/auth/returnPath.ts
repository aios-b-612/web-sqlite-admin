import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'

export const AUTH_RETURN_PATH_KEY = 'octor_auth_return_path'

export function parseSameOriginReturnPath(
  value: string | null | undefined,
): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  try {
    const url = new URL(trimmed)
    if (typeof window !== 'undefined' && url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`
    }
  } catch {
    return null
  }
  return null
}

export function resolvePostAuthReturnPath(
  searchParams?: URLSearchParams,
): string {
  const params = searchParams ?? new URLSearchParams(window.location.search)
  const fromQuery = parseSameOriginReturnPath(params.get(REDIRECT_URL_KEY))
  const fromStorage = parseSameOriginReturnPath(
    sessionStorage.getItem(AUTH_RETURN_PATH_KEY),
  )
  sessionStorage.removeItem(AUTH_RETURN_PATH_KEY)
  return fromQuery ?? fromStorage ?? appConfig.authenticatedEntryPath
}

export function rememberAuthReturnPath(returnPath: string): void {
  const safe =
    parseSameOriginReturnPath(returnPath) ?? appConfig.authenticatedEntryPath
  sessionStorage.setItem(AUTH_RETURN_PATH_KEY, safe)
}

export function stripRedirectUrlFromLocation(): void {
  const params = new URLSearchParams(window.location.search)
  if (!params.has(REDIRECT_URL_KEY)) return
  params.delete(REDIRECT_URL_KEY)
  const query = params.toString()
  const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', next)
}
