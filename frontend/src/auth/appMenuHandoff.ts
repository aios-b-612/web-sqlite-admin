import { REDIRECT_URL_KEY } from '@/constants/app.constant'

export const SSO_ACCESS_TOKEN_HASH_KEY = 'access_token'

/**
 * Handoff SSO entre apps Octor:
 * `{app}/auth/callback?redirectUrl=…#access_token=…`
 */
export function buildAppMenuHandoffUrl(
  appUrl: string,
  accessToken: string | null | undefined,
  currentOrigin: string = typeof window !== 'undefined'
    ? window.location.origin
    : '',
): string {
  const trimmed = (appUrl || '').trim()
  if (!trimmed) return '#'

  let target: URL
  try {
    target = new URL(trimmed, currentOrigin || undefined)
  } catch {
    return trimmed
  }

  if (currentOrigin && target.origin === currentOrigin) {
    return `${target.pathname}${target.search}${target.hash}` || trimmed
  }

  const host = target.hostname.toLowerCase()
  if (
    host === 'help.octor.com.br' ||
    host.startsWith('help.') ||
    host === 'ajuda.octor.com.br' ||
    host.startsWith('ajuda.')
  ) {
    return target.toString()
  }

  const token = typeof accessToken === 'string' ? accessToken.trim() : ''
  if (!token) return target.toString()

  const returnPath =
    !target.pathname || target.pathname === '/'
      ? '/home'
      : `${target.pathname}${target.search}`

  const callback = new URL('/auth/callback', target.origin)
  callback.searchParams.set(REDIRECT_URL_KEY, returnPath)
  callback.hash = `${SSO_ACCESS_TOKEN_HASH_KEY}=${encodeURIComponent(token)}`
  return callback.toString()
}
