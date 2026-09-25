'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import appConfig from '@/configs/app.config'
import {
  accountDataToSessionUser,
  fetchAccountData,
} from '@/auth/account'
import { redirectToCentralAuthSignIn } from '@/auth/centralAuth'
import {
  resolvePostAuthReturnPath,
  stripRedirectUrlFromLocation,
} from '@/auth/returnPath'
import {
  bootstrapAccessTokenFromCookie,
  clearOctorAuthSession,
  readAccessTokenFromLocationHash,
  stripAccessTokenFromLocationHash,
  useOctorAuthStore,
} from '@/store/octorAuthStore'

const ERROR_MSG =
  'Não foi possível concluir o login. Tente novamente pelo portal de autenticação.'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setToken = useOctorAuthStore((s) => s.setToken)
  const setUser = useOctorAuthStore((s) => s.setUser)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const fromHash = readAccessTokenFromLocationHash()
      let accessToken = fromHash
      if (!accessToken) {
        accessToken = await bootstrapAccessTokenFromCookie(
          appConfig.authApiPrefix,
        )
      }
      if (cancelled) return
      if (!accessToken) {
        setErrorMessage(ERROR_MSG)
        return
      }
      if (fromHash) stripAccessTokenFromLocationHash()

      try {
        const account = await fetchAccountData(
          appConfig.authApiPrefix,
          accessToken,
        )
        if (cancelled) return
        setToken(accessToken)
        setUser(accountDataToSessionUser(account))
      } catch {
        if (cancelled) return
        clearOctorAuthSession()
        setErrorMessage(ERROR_MSG)
        return
      }

      const returnPath = resolvePostAuthReturnPath(
        new URLSearchParams(searchParams.toString()),
      )
      stripRedirectUrlFromLocation()
      router.replace(returnPath || appConfig.authenticatedEntryPath)
    })()
    return () => {
      cancelled = true
    }
  }, [router, searchParams, setToken, setUser])

  if (errorMessage) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-gray-700 dark:text-gray-300">{errorMessage}</p>
        <Button
          onClick={() =>
            redirectToCentralAuthSignIn(
              appConfig.authPortalOrigin,
              appConfig.authenticatedEntryPath,
            )
          }
        >
          Ir para o login
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <Spinner size="40px" />
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center">
          <Spinner size="40px" />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
