import type { OctorSessionUser } from '@/auth/account'

export type HeaderSession = {
  user: {
    name: string
    email: string
    image: string | null
    authority: string[]
  }
}

export function sessionFromOctorUser(
  user: OctorSessionUser,
  signedIn: boolean,
): HeaderSession | null {
  if (!signedIn) return null
  const name = user.userName?.trim() ?? ''
  const email = user.email?.trim() ?? ''
  if (!name && !email) return null
  return {
    user: {
      name,
      email,
      image: user.avatar?.trim() ? user.avatar : null,
      authority: user.authority ?? [],
    },
  }
}
