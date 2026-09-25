import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import {
  rememberAuthReturnPath,
  parseSameOriginReturnPath,
} from '@/auth/returnPath'

export function isCentralAuthEnabled(
  authApiPrefix: string,
  authPortalOrigin: string = '',
): boolean {
  if (authPortalOrigin.trim()) return true
  const trimmed = authApiPrefix.trim()
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
}

export function buildCentralAuthSignInUrl(
  authPortalOrigin: string,
  returnPath: string,
  appOrigin: string = typeof window !== 'undefined' ? window.location.origin : '',
  options?: { promptLogin?: boolean },
): string {
  const portal = authPortalOrigin.trim()
  if (!portal) return returnPath

  const safeReturn =
    returnPath.startsWith('/') && !returnPath.startsWith('//')
      ? returnPath
      : '/home'

  rememberAuthReturnPath(safeReturn)

  const normalizedReturn = parseSameOriginReturnPath(safeReturn) ?? safeReturn
  const returnUrl = `${appOrigin.replace(/\/+$/, '')}/auth/callback?${REDIRECT_URL_KEY}=${encodeURIComponent(normalizedReturn)}`

  const params = new URLSearchParams()
  params.set(REDIRECT_URL_KEY, returnUrl)
  if (options?.promptLogin) params.set('prompt', 'login')

  return `${portal.replace(/\/+$/, '')}/sign-in/?${params.toString()}`
}

export function buildCentralAuthLogoutUrl(
  authPortalOrigin: string,
  postLogoutRedirect: string,
): string {
  const portal = authPortalOrigin.trim().replace(/\/+$/, '')
  if (!portal) return postLogoutRedirect
  const params = new URLSearchParams({ redirect_uri: postLogoutRedirect })
  return `${portal}/logout/?${params.toString()}`
}

export function redirectToCentralAuthSignIn(
  authPortalOrigin: string,
  returnPath: string = typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}`
    : '/home',
  options?: { promptLogin?: boolean },
): void {
  window.location.replace(
    buildCentralAuthSignInUrl(
      authPortalOrigin,
      returnPath,
      window.location.origin,
      options,
    ),
  )
}

export function redirectToCentralAuthLogout(
  authPortalOrigin: string,
  postLogoutRedirect: string = `${typeof window !== 'undefined' ? window.location.origin : ''}/sign-in?logged_out=1`,
): void {
  window.location.replace(
    buildCentralAuthLogoutUrl(authPortalOrigin, postLogoutRedirect),
  )
}
