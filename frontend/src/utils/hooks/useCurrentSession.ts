import { useContext } from 'react'
import SessionContext from '@/components/auth/AuthProvider/SessionContext'
import appConfig from '@/configs/app.config'
import { useOctorAuthStore } from '@/store/octorAuthStore'
import { sessionFromOctorUser } from '@/utils/hooks/sessionFromOctorUser'

const useCurrentSession = () => {
  const nextAuthSession = useContext(SessionContext)
  const user = useOctorAuthStore((state) => state.user)
  const signedIn = useOctorAuthStore((state) => state.sessionSignedIn)
  const token = useOctorAuthStore((state) => state.token)

  if (appConfig.centralAuthEnabled) {
    return {
      session: sessionFromOctorUser(user, signedIn || Boolean(token)),
    }
  }

  if (appConfig.panelPasswordAuth) {
    return {
      session: {
        user: {
          name: 'SQLite Admin',
          email: 'Painel por senha',
          image: undefined,
          authority: [] as string[],
        },
      },
    }
  }

  return {
    session: nextAuthSession,
  }
}

export default useCurrentSession
