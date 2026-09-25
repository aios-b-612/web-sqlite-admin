'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  EMPTY_SESSION_USER,
  type OctorSessionUser,
} from '@/auth/account'

const TOKEN_KEY = 'access_token'

type AuthState = {
  token: string
  sessionSignedIn: boolean
  accountLoaded: boolean
  user: OctorSessionUser
  setToken: (token: string) => void
  setSessionSignedIn: (signedIn: boolean) => void
  setUser: (user: OctorSessionUser) => void
  setAccountLoaded: (loaded: boolean) => void
  clear: () => void
}

export const useOctorAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: '',
      sessionSignedIn: false,
      accountLoaded: false,
      user: EMPTY_SESSION_USER,
      setToken: (token) => set({ token, sessionSignedIn: Boolean(token) }),
      setSessionSignedIn: (sessionSignedIn) => set({ sessionSignedIn }),
      setUser: (user) => set({ user, accountLoaded: true }),
      setAccountLoaded: (accountLoaded) => set({ accountLoaded }),
      clear: () =>
        set({
          token: '',
          sessionSignedIn: false,
          accountLoaded: false,
          user: EMPTY_SESSION_USER,
        }),
    }),
    {
      name: 'octor-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        sessionSignedIn: state.sessionSignedIn,
        user: state.user,
        accountLoaded: state.accountLoaded,
      }),
    },
  ),
)

export function clearOctorAuthSession(): void {
  useOctorAuthStore.getState().clear()
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  }
}

export function readAccessTokenFromLocationHash(): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.location.hash.replace(/^#/, '').trim()
  if (!raw) return null
  const params = new URLSearchParams(raw)
  const token = params.get(TOKEN_KEY)
  return typeof token === 'string' && token.length > 0 ? token : null
}

export function stripAccessTokenFromLocationHash(): void {
  if (typeof window === 'undefined') return
  if (!window.location.hash.includes(TOKEN_KEY)) return
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  params.delete(TOKEN_KEY)
  const remainder = params.toString()
  const next = `${window.location.pathname}${window.location.search}${remainder ? `#${remainder}` : ''}`
  window.history.replaceState({}, '', next)
}

/** Cookie SSO → access_token via web-auth GET /v1/auth/session */
export async function bootstrapAccessTokenFromCookie(
  authApiPrefix: string,
): Promise<string | null> {
  const base = authApiPrefix.replace(/\/$/, '')
  try {
    const resp = await fetch(`${base}/v1/auth/session`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!resp.ok) return null
    const data = (await resp.json()) as {
      status?: boolean
      access_token?: string
    }
    if (data?.status !== true) return null
    const token = data.access_token
    return typeof token === 'string' && token.length > 0 ? token : null
  } catch {
    return null
  }
}
