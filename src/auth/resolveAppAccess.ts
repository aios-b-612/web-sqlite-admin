/**
 * Gate de entitlement de app de cliente (plano / perfil / impersonação).
 * SSO autenticado sozinho não autoriza — ver app-acesso-plano-impersonacao.
 */

export type AccountAppRef = {
  id?: string | null
}

export type ResolveAppAccessInput = {
  profile?: string | null
  companyUuid?: string | null
  apps?: AccountAppRef[] | null
  /** Id no AppMenu registry (ex.: stock, crm). Vazio = só admin/company (scaffold). */
  appId: string
  impersonationSource?: string | null
}

export type ResolveAppAccessResult =
  | { allowed: true }
  | {
      allowed: false
      reason: 'admin' | 'no_company' | 'app_not_entitled' | 'promoter_crm_only'
    }

export const CRM_APP_ID = 'crm'

export function accountHasApp(
  apps: AccountAppRef[] | null | undefined,
  appId: string,
): boolean {
  if (!Array.isArray(apps) || !appId) return false
  return apps.some((app) => app?.id === appId)
}

export function resolveAppAccess({
  profile,
  companyUuid,
  apps,
  appId,
  impersonationSource,
}: ResolveAppAccessInput): ResolveAppAccessResult {
  const normalizedProfile = (profile ?? '').trim().toLowerCase()
  if (normalizedProfile === 'admin') {
    return { allowed: false, reason: 'admin' }
  }

  if (!companyUuid?.trim()) {
    return { allowed: false, reason: 'no_company' }
  }

  const source = (impersonationSource ?? '').trim().toLowerCase()
  const normalizedAppId = appId.trim()

  if (source === 'promoter' && normalizedAppId && normalizedAppId !== CRM_APP_ID) {
    return { allowed: false, reason: 'promoter_crm_only' }
  }

  // Scaffold do template sem NEXT_PUBLIC_APP_ID: só admin + company.
  if (!normalizedAppId) {
    return { allowed: true }
  }

  if (!accountHasApp(apps, normalizedAppId)) {
    return { allowed: false, reason: 'app_not_entitled' }
  }

  return { allowed: true }
}
