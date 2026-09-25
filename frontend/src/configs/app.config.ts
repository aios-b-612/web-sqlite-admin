import { normalizeApiPrefix } from '@/configs/normalizeApiPrefix'
import { resolveAuthApiPrefix } from '@/configs/resolveAuthApiPrefix'
import { resolveAuthPortalOrigin } from '@/configs/resolveAuthPortalOrigin'

export type AppConfig = {
  apiPrefix: string
  authApiPrefix: string
  authPortalOrigin: string
  centralAuthEnabled: boolean
  /** Sidecar hosting: login por senha na API (sem NextAuth/SSO). */
  panelPasswordAuth: boolean
  authenticatedEntryPath: string
  unAuthenticatedEntryPath: string
  locale: string
  activeNavTranslation: boolean
  appUrl: string
  /** Id no AppMenu registry (ex. stock, crm). Obrigatório em app de produto. */
  appId: string
}

const isDev = process.env.NODE_ENV === 'development'

const authApiPrefix = resolveAuthApiPrefix({
  isDev,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  authUrl: process.env.NEXT_PUBLIC_AUTH_API_URL,
})

const authPortalOrigin = resolveAuthPortalOrigin({
  authPortalUrl: process.env.NEXT_PUBLIC_AUTH_PORTAL_URL,
  authApiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL,
})

const centralForcedOff =
  process.env.NEXT_PUBLIC_CENTRAL_AUTH_ENABLED === 'false'

/** Default on: este produto é o admin SQLite do hosting (senha = PASSWORD da API). */
const panelPasswordAuth =
  process.env.NEXT_PUBLIC_SQLITE_PANEL_PASSWORD_AUTH !== 'false'

const appConfig: AppConfig = {
  apiPrefix: isDev
    ? '/api'
    : normalizeApiPrefix(process.env.NEXT_PUBLIC_API_URL || '/api'),
  authApiPrefix,
  authPortalOrigin,
  centralAuthEnabled:
    !centralForcedOff &&
    !panelPasswordAuth &&
    Boolean(
      authPortalOrigin ||
        authApiPrefix.startsWith('http://') ||
        authApiPrefix.startsWith('https://'),
    ),
  panelPasswordAuth,
  authenticatedEntryPath: '/home',
  unAuthenticatedEntryPath: '/sign-in',
  locale: 'pt-br',
  activeNavTranslation: false,
  appUrl: (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, ''),
  appId: (process.env.NEXT_PUBLIC_APP_ID || '').trim(),
}

export default appConfig
