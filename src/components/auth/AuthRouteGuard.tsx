'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import AccessDeniedNotice from '@/components/shared/AccessDeniedNotice'
import appConfig from '@/configs/app.config'
import {
  accountDataToSessionUser,
  fetchAccountData,
} from '@/auth/account'
import { redirectToCentralAuthLogout, redirectToCentralAuthSignIn } from '@/auth/centralAuth'
import { resolveAppAccess } from '@/auth/resolveAppAccess'
import {
  bootstrapAccessTokenFromCookie,
  clearOctorAuthSession,
  readAccessTokenFromLocationHash,
  stripAccessTokenFromLocationHash,
  useOctorAuthStore,
} from '@/store/octorAuthStore'

type AuthRouteGuardProps = {
  children: ReactNode
}

/**
 * SSO + hydrate GET /v1/account + gate de entitlement.
 * Com SSO off, NextAuth middleware continua responsável.
 */
const AuthRouteGuard = ({ children }: AuthRouteGuardProps) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const token = useOctorAuthStore((s) => s.token)
  const user = useOctorAuthStore((s) => s.user)
  const accountLoaded = useOctorAuthStore((s) => s.accountLoaded)
  const setToken = useOctorAuthStore((s) => s.setToken)
  const setUser = useOctorAuthStore((s) => s.setUser)
  const [settled, setSettled] = useState(!appConfig.centralAuthEnabled)
  const [accountError, setAccountError] = useState(false)
  const redirectingRef = useRef(false)
  const hydratingRef = useRef(false)
  const isCallback = pathname.startsWith('/auth/callback')

  const returnPath =
    pathname === '/'
      ? appConfig.authenticatedEntryPath
      : `${pathname}${search ? `?${search}` : ''}`

  useEffect(() => {
    if (!appConfig.centralAuthEnabled || isCallback) {
      setSettled(true)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        let accessToken = token
        if (!accessToken) {
          const fromHash = readAccessTokenFromLocationHash()
          if (fromHash) {
            accessToken = fromHash
            setToken(fromHash)
            stripAccessTokenFromLocationHash()
          } else {
            const fromCookie = await bootstrapAccessTokenFromCookie(
              appConfig.authApiPrefix,
            )
            if (cancelled) return
            if (fromCookie) {
              accessToken = fromCookie
              setToken(fromCookie)
            }
          }
        }

        if (!accessToken) {
          clearOctorAuthSession()
          return
        }

        if (accountLoaded && user.email) {
          return
        }

        if (hydratingRef.current) return
        hydratingRef.current = true
        try {
          const account = await fetchAccountData(
            appConfig.authApiPrefix,
            accessToken,
          )
          if (cancelled) return
          setUser(accountDataToSessionUser(account))
          setAccountError(false)
        } catch {
          if (!cancelled) {
            setAccountError(true)
            clearOctorAuthSession()
          }
        } finally {
          hydratingRef.current = false
        }
      } finally {
        if (!cancelled) setSettled(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accountLoaded, isCallback, setToken, setUser, token, user.email])

  useEffect(() => {
    if (!appConfig.centralAuthEnabled || !settled || isCallback) return
    if (token || redirectingRef.current) return
    if (!appConfig.authPortalOrigin) return
    redirectingRef.current = true
    redirectToCentralAuthSignIn(appConfig.authPortalOrigin, returnPath)
  }, [settled, token, isCallback, returnPath])

  if (!appConfig.centralAuthEnabled) {
    return <>{children}</>
  }

  if (!settled || (!token && !isCallback) || (token && !accountLoaded && !isCallback && !accountError)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Spinner size="40px" />
      </div>
    )
  }

  if (isCallback) {
    return <>{children}</>
  }

  if (!token || accountError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Spinner size="40px" />
      </div>
    )
  }

  const access = resolveAppAccess({
    profile: user.profile,
    companyUuid: user.company_uuid,
    apps: user.apps,
    appId: appConfig.appId,
    impersonationSource: user.impersonation_source,
  })

  if (!access.allowed) {
    return (
      <AccessDeniedNotice
        reason={access.reason}
        onSignOut={() => {
          clearOctorAuthSession()
          redirectToCentralAuthLogout(
            appConfig.authPortalOrigin,
            `${window.location.origin}/sign-in?logged_out=1`,
          )
        }}
      />
    )
  }

  return <>{children}</>
}

export default AuthRouteGuard
