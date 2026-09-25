import { ReactNode, Suspense } from 'react'
import AuthRouteGuard from '@/components/auth/AuthRouteGuard'
import PanelShell from '@/components/layouts/PanelShell'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import appConfig from '@/configs/app.config'

const Layout = async ({ children }: { children: ReactNode }) => {
    if (appConfig.panelPasswordAuth) {
        return <PanelShell>{children}</PanelShell>
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
