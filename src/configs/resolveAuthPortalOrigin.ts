/** Origem do portal web-auth (sign-in). Produção: https://auth.octor.com.br */
export function resolveAuthPortalOrigin(options: {
  authPortalUrl: string | undefined
  authApiUrl: string | undefined
}): string {
  const portal = options.authPortalUrl?.trim()
  if (portal) {
    try {
      return new URL(portal).origin
    } catch {
      return portal.replace(/\/+$/, '')
    }
  }

  const authApi = options.authApiUrl?.trim()
  if (authApi) {
    try {
      const withProtocol =
        authApi.startsWith('http://') || authApi.startsWith('https://')
          ? authApi
          : `https://${authApi}`
      return new URL(withProtocol).origin
    } catch {
      return authApi.replace(/\/+$/, '')
    }
  }

  return ''
}
