import { describe, expect, it } from 'vitest'
import { EMPTY_SESSION_USER } from '@/auth/account'
import { sessionFromOctorUser } from './sessionFromOctorUser'

describe('sessionFromOctorUser', () => {
  it('preenche nome e e-mail da conta SSO', () => {
    const session = sessionFromOctorUser(
      {
        ...EMPTY_SESSION_USER,
        userName: 'Maria Silva',
        email: 'maria@clinica.com',
        avatar: 'https://cdn.example/logo.png',
      },
      true,
    )
    expect(session?.user).toEqual({
      name: 'Maria Silva',
      email: 'maria@clinica.com',
      image: 'https://cdn.example/logo.png',
      authority: [],
    })
  })

  it('não cai em Anonymous quando há sessão', () => {
    const session = sessionFromOctorUser(
      { ...EMPTY_SESSION_USER, userName: 'João', email: 'j@x.com' },
      true,
    )
    expect(session?.user.name).not.toBe('Anonymous')
    expect(session?.user.email).not.toBe('No email available')
  })

  it('sem sessão devolve null', () => {
    expect(sessionFromOctorUser(EMPTY_SESSION_USER, false)).toBeNull()
  })
})
