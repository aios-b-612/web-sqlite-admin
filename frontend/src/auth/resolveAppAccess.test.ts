import { describe, expect, it } from 'vitest'
import {
  CRM_APP_ID,
  accountHasApp,
  resolveAppAccess,
} from './resolveAppAccess'

describe('accountHasApp', () => {
  it('detecta id na lista', () => {
    expect(accountHasApp([{ id: 'stock' }], 'stock')).toBe(true)
    expect(accountHasApp([{ id: 'crm' }], 'stock')).toBe(false)
    expect(accountHasApp(null, 'stock')).toBe(false)
  })
})

describe('resolveAppAccess', () => {
  const entitled = {
    profile: 'owner',
    companyUuid: 'company-1',
    apps: [{ id: 'stock' }],
    appId: 'stock',
  }

  it('permite owner com app no account.apps', () => {
    expect(resolveAppAccess(entitled)).toEqual({ allowed: true })
  })

  it('nega profile admin mesmo com apps', () => {
    expect(
      resolveAppAccess({
        ...entitled,
        profile: 'admin',
      }),
    ).toEqual({ allowed: false, reason: 'admin' })
  })

  it('nega sessão sem company_uuid', () => {
    expect(resolveAppAccess({ ...entitled, companyUuid: '' })).toEqual({
      allowed: false,
      reason: 'no_company',
    })
  })

  it('nega quando app não está em account.apps', () => {
    expect(
      resolveAppAccess({
        ...entitled,
        profile: 'employee',
        apps: [{ id: 'crm' }],
      }),
    ).toEqual({ allowed: false, reason: 'app_not_entitled' })
  })

  it('com appId vazio (scaffold) só exige admin/company', () => {
    expect(
      resolveAppAccess({
        profile: 'owner',
        companyUuid: 'c1',
        apps: [],
        appId: '',
      }),
    ).toEqual({ allowed: true })
  })

  it('nega impersonação de promotor fora do CRM', () => {
    expect(
      resolveAppAccess({
        ...entitled,
        impersonationSource: 'promoter',
      }),
    ).toEqual({ allowed: false, reason: 'promoter_crm_only' })
  })

  it('permite promotor só no CRM se entitlement ok', () => {
    expect(
      resolveAppAccess({
        profile: 'owner',
        companyUuid: 'company-1',
        apps: [{ id: CRM_APP_ID }],
        appId: CRM_APP_ID,
        impersonationSource: 'promoter',
      }),
    ).toEqual({ allowed: true })
  })
})
