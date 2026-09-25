export type AccountAppItem = {
  id: string
  name: string
  href: string
  icon: string
  color?: string
  order?: number
  openInNewTab?: boolean
}

export type AccountDataResponse = {
  fullname: string
  email: string
  company_fantasy_name?: string
  company_logo?: string
  company_uuid?: string
  company_logo_url?: string
  uuid?: string
  owner_uuid?: string
  employee_uuid?: string
  profile?: string
  roles?: Record<string, unknown>
  modules?: Record<string, unknown>
  apps?: AccountAppItem[]
  impersonation_source?: string | null
  impersonation?: { source?: string | null }
  accepts_beta_features?: boolean
}

export type OctorSessionUser = {
  userName: string
  email: string
  avatar: string
  authority: string[]
  userId: string | null
  owner_uuid: string | null
  employee_uuid: string | null
  company_uuid: string | null
  company_fantasy_name: string | null
  profile: string | null
  modules: Record<string, unknown>
  roles: Record<string, unknown>
  apps: AccountAppItem[]
  impersonation_source: string | null
}

export const EMPTY_SESSION_USER: OctorSessionUser = {
  userName: '',
  email: '',
  avatar: '',
  authority: [],
  userId: null,
  owner_uuid: null,
  employee_uuid: null,
  company_uuid: null,
  company_fantasy_name: null,
  profile: null,
  modules: {},
  roles: {},
  apps: [],
  impersonation_source: null,
}

function resolveAuthority(accountData: AccountDataResponse): string[] {
  const { roles, modules } = accountData
  if (!roles || typeof roles !== 'object') return []
  return Object.entries(roles)
    .filter(([key, hasRole]) => {
      if (!hasRole) return false
      if (modules && Object.prototype.hasOwnProperty.call(modules, key)) {
        return Boolean(modules[key])
      }
      return true
    })
    .map(([key]) => key)
}

export function accountDataToSessionUser(
  accountData: AccountDataResponse,
): OctorSessionUser {
  return {
    userName: accountData.fullname,
    email: accountData.email,
    avatar: accountData.company_logo_url || '',
    authority: resolveAuthority(accountData),
    userId: accountData.employee_uuid ?? accountData.uuid ?? null,
    owner_uuid: accountData.owner_uuid ?? null,
    employee_uuid: accountData.employee_uuid ?? null,
    company_uuid: accountData.company_uuid ?? null,
    company_fantasy_name: accountData.company_fantasy_name ?? null,
    profile: accountData.profile ?? null,
    modules: accountData.modules ?? {},
    roles: accountData.roles ?? {},
    apps: accountData.apps ?? [],
    impersonation_source:
      accountData.impersonation?.source ??
      accountData.impersonation_source ??
      null,
  }
}

function normalizeAccountDataResponse(raw: unknown): AccountDataResponse {
  if (raw && typeof raw === 'object' && 'fullname' in raw && 'email' in raw) {
    return raw as AccountDataResponse
  }
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const inner = (raw as { data: unknown }).data
    if (
      inner &&
      typeof inner === 'object' &&
      'fullname' in inner &&
      'email' in inner
    ) {
      return inner as AccountDataResponse
    }
  }
  throw new Error('Formato de resposta da conta não reconhecido')
}

/**
 * GET /v1/account no web-auth (sem trailing slash).
 * `authApiPrefix` já é origem sem /v1 (normalizeApiPrefix).
 */
export async function fetchAccountData(
  authApiPrefix: string,
  accessToken: string,
): Promise<AccountDataResponse> {
  const base = authApiPrefix.replace(/\/$/, '')
  const resp = await fetch(`${base}/v1/account`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!resp.ok) {
    throw new Error(`account HTTP ${resp.status}`)
  }
  return normalizeAccountDataResponse(await resp.json())
}
