import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import AuthRouteGuard from '@/components/auth/AuthRouteGuard'
import { ReactNode, Suspense } from 'react'

const Layout = async ({ children }: { children: ReactNode }) => {
    return (
        <Suspense fallback={null}>
            <AuthRouteGuard>
                <PostLoginLayout>{children}</PostLoginLayout>
            </AuthRouteGuard>
        </Suspense>
    )
}

export default Layout
