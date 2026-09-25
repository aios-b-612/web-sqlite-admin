import type { Routes } from '@/@types/routes'

const authRoute: Routes = {
    '/sign-in': {
        key: 'signIn',
        authority: [],
    },
    '/sign-up': {
        key: 'signUp',
        authority: [],
    },
    '/forgot-password': {
        key: 'forgotPassword',
        authority: [],
    },
    '/reset-password': {
        key: 'resetPassword',
        authority: [],
    },
    '/otp-verification': {
        key: 'otpVerification',
        authority: [],
    },
    '/auth/callback': {
        key: 'authCallback',
        authority: [],
    },
}

export default authRoute
