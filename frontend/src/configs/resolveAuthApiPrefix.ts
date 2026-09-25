import { normalizeApiPrefix } from '@/configs/normalizeApiPrefix'

/** Base URL das rotas de identidade (`/v1/auth/*`, `/v1/account`). */
export function resolveAuthApiPrefix(options: {
  isDev: boolean
  apiUrl: string | undefined
  authUrl: string | undefined
}): string {
  const auth = options.authUrl?.trim()
  if (auth) return normalizeApiPrefix(auth)
  if (options.isDev) return '/api'
  return normalizeApiPrefix(options.apiUrl || '/api')
}
