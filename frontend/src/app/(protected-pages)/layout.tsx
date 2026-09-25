import { ReactNode, Suspense } from 'react'
import AuthRouteGuard from '@/components/auth/AuthRouteGuard'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import appConfig from '@/configs/app.config'

const Layout = async ({ children }: { children: ReactNode }) => {
    if (appConfig.panelPasswordAuth) {
        return (
            <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
                {children}
            </div>
        )
    }

    return (
        <Suspense fallback={null}>
            <AuthRouteGuard>
                <PostLoginLayout>{children}</PostLoginLayout>
            </AuthRouteGuard>
        </Suspense>
    )
}

export default Layout
