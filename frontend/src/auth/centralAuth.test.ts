import { beforeAll, describe, expect, it } from 'vitest'
import { buildCentralAuthSignInUrl } from './centralAuth'
import { buildAppMenuHandoffUrl } from './appMenuHandoff'

beforeAll(() => {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
      clear: () => store.clear(),
    },
    configurable: true,
  })
})

describe('centralAuth', () => {
  it('monta URL de sign-in com callback', () => {
    const url = buildCentralAuthSignInUrl(
      'https://auth.octor.com.br',
      '/home',
      'https://foo.octor.com.br',
    )
    expect(url.startsWith('https://auth.octor.com.br/sign-in/?')).toBe(true)
    expect(url).toContain('redirectUrl=')
    expect(decodeURIComponent(url)).toContain(
      'https://foo.octor.com.br/auth/callback',
    )
  })
})

describe('appMenuHandoff', () => {
  it('mesma origem devolve path local', () => {
    expect(
      buildAppMenuHandoffUrl(
        'https://foo.octor.com.br/home',
        'tok',
        'https://foo.octor.com.br',
      ),
    ).toBe('/home')
  })

  it('destino externo inclui callback + hash token', () => {
    const url = buildAppMenuHandoffUrl(
      'https://estoque.octor.com.br/',
      'abc123',
      'https://foo.octor.com.br',
    )
    expect(url).toContain('https://estoque.octor.com.br/auth/callback')
    expect(url).toContain('#access_token=abc123')
  })
})
