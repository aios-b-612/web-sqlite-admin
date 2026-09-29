import type { AxiosError } from 'axios'
import { shouldClearAuthSessionOnAxiosError } from '@/auth/authSessionGuard'
import { clearOctorAuthSession } from '@/store/octorAuthStore'
import { reportAxiosError } from '@/utils/errorReporter'
import appConfig from '@/configs/app.config'
import { redirectToCentralAuthSignIn } from '@/auth/centralAuth'
import { notifyIfInvalidTokenPayload } from './expiredTokenSession'

const AxiosResponseIntrceptorErrorCallback = (error: AxiosError) => {
    notifyIfInvalidTokenPayload(error.response?.data)
    void reportAxiosError(error)

    if (!shouldClearAuthSessionOnAxiosError(error)) {
        return
    }

    clearOctorAuthSession()

    if (
        typeof window !== 'undefined' &&
        appConfig.centralAuthEnabled &&
        appConfig.authPortalOrigin
    ) {
        redirectToCentralAuthSignIn(
            appConfig.authPortalOrigin,
            appConfig.authenticatedEntryPath,
            { promptLogin: true },
        )
    }
}

export default AxiosResponseIntrceptorErrorCallback
