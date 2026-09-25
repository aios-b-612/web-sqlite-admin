import NextAuth from 'next-auth'

import authConfig from '@/configs/auth.config'
import {
    authRoutes as _authRoutes,
    publicRoutes as _publicRoutes,
} from '@/configs/routes.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import appConfig from '@/configs/app.config'

const { auth } = NextAuth(authConfig)

const publicRoutes = Object.entries(_publicRoutes).map(([key]) => key)
const authRoutes = Object.entries(_authRoutes).map(([key]) => key)

const apiAuthPrefix = `${appConfig.apiPrefix}/auth`

const ALWAYS_PUBLIC_PREFIXES = [
    '/api/health',
    '/api/errors',
    '/auth/callback',
]

export default auth((req) => {
    const { nextUrl } = req
    const pathname = nextUrl.pathname

    if (ALWAYS_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
        return
    }

    /**
     * SSO web-auth: gate no cliente (AuthRouteGuard).
     * Painel SQLite por senha: auth na API Rust (PASSWORD) — sem NextAuth.
     * NextAuth local só para scaffold sem NEXT_PUBLIC_AUTH_*.
     */
    if (appConfig.centralAuthEnabled || appConfig.panelPasswordAuth) {
        return
    }

    const isSignedIn = !!req.auth
    const isApiAuthRoute = pathname.startsWith(apiAuthPrefix)
    const isPublicRoute = publicRoutes.includes(pathname)
    const isAuthRoute = authRoutes.includes(pathname)

    if (isApiAuthRoute) return

    if (isAuthRoute) {
        if (isSignedIn) {
            return Response.redirect(
                new URL(appConfig.authenticatedEntryPath, nextUrl),
            )
        }
        return
    }

    if (!isSignedIn && !isPublicRoute) {
        let callbackUrl = pathname
        if (nextUrl.search) {
            callbackUrl += nextUrl.search
        }

        return Response.redirect(
            new URL(
                `${appConfig.unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${callbackUrl}`,
                nextUrl,
            ),
        )
    }
})

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api)(.*)'],
}
