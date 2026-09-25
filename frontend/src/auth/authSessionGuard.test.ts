import { describe, expect, it } from 'vitest'
import {
  isAuthDeniedPayload,
  isAuthIdentityRequest,
  shouldClearAuthSessionOnAxiosError,
} from './authSessionGuard'
import type { AxiosError } from 'axios'

function ax(partial: {
  status?: number
  url?: string
  data?: unknown
}): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'test',
    toJSON: () => ({}),
    response:
      partial.status === undefined
        ? undefined
        : {
            status: partial.status,
            data: partial.data,
            statusText: '',
            headers: {},
            config: {} as never,
          },
    config: { url: partial.url } as never,
  } as AxiosError
}

describe('authSessionGuard', () => {
  it('não limpa sem response (rede)', () => {
    expect(shouldClearAuthSessionOnAxiosError(ax({}))).toBe(false)
  })

  it('não limpa 401 em /auth/session', () => {
    expect(
      shouldClearAuthSessionOnAxiosError(
        ax({ status: 401, url: '/v1/auth/session' }),
      ),
    ).toBe(false)
  })

  it('não limpa 401 genérico de API de negócio', () => {
    expect(
      shouldClearAuthSessionOnAxiosError(ax({ status: 401, url: '/v2/items' })),
    ).toBe(false)
  })

  it('limpa 401 em /v1/account', () => {
    expect(
      shouldClearAuthSessionOnAxiosError(
        ax({ status: 401, url: 'https://auth.octor.com.br/v1/account' }),
      ),
    ).toBe(true)
  })

  it('limpa payload status:false + unauthorized', () => {
    expect(
      isAuthDeniedPayload({ status: false, message: 'Unauthorized' }),
    ).toBe(true)
    expect(
      shouldClearAuthSessionOnAxiosError(
        ax({
          status: 403,
          url: '/v2/x',
          data: { status: false, message: 'access denied' },
        }),
      ),
    ).toBe(true)
  })

  it('detecta rota de identidade', () => {
    expect(isAuthIdentityRequest('/v1/auth/introspect')).toBe(true)
    expect(isAuthIdentityRequest('/v2/stock')).toBe(false)
  })
})
