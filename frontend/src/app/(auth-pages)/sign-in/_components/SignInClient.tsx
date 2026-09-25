'use client'

import { useEffect } from 'react'
import SignIn from '@/components/auth/SignIn'
import { onSignInWithCredentials } from '@/server/actions/auth/handleSignIn'
import handleOauthSignIn from '@/server/actions/auth/handleOauthSignIn'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useSearchParams } from 'next/navigation'
import appConfig from '@/configs/app.config'
import { redirectToCentralAuthSignIn } from '@/auth/centralAuth'
import Spinner from '@/components/ui/Spinner'
import type {
    OnSignInPayload,
    OnOauthSignInPayload,
} from '@/components/auth/SignIn'

const SignInClient = () => {
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get(REDIRECT_URL_KEY)

    useEffect(() => {
        if (!appConfig.centralAuthEnabled || !appConfig.authPortalOrigin) {
            return
        }
        redirectToCentralAuthSignIn(
            appConfig.authPortalOrigin,
            callbackUrl || appConfig.authenticatedEntryPath,
        )
    }, [callbackUrl])

    if (appConfig.centralAuthEnabled) {
        return (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
                <Spinner size="40px" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Redirecionando para o portal de autenticação…
                </p>
            </div>
        )
    }

    const handleSignIn = ({
        values,
        setSubmitting,
        setMessage,
    }: OnSignInPayload) => {
        setSubmitting(true)

        onSignInWithCredentials(values, callbackUrl || '').then((data) => {
            if (data?.error) {
                setMessage(data.error as string)
                setSubmitting(false)
            }
        })
    }

    const handleOAuthSignIn = async ({ type }: OnOauthSignInPayload) => {
        if (type === 'google') {
            await handleOauthSignIn('google')
        }
        if (type === 'github') {
            await handleOauthSignIn('github')
        }
    }

    return <SignIn onSignIn={handleSignIn} onOauthSignIn={handleOAuthSignIn} />
}

export default SignInClient
