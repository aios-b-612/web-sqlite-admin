'use client'

import { ReactNode, useEffect, useState } from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'

export const SQLITE_ADMIN_TOKEN_KEY = 'octor_sqlite_admin_token'
export const SQLITE_ADMIN_AUTH_EVENT = 'octor-sqlite-auth'

/** Dispara após login/logout no mesmo tab (storage event só cobre outros tabs). */
export function notifySqliteAdminAuthChanged() {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event(SQLITE_ADMIN_AUTH_EVENT))
}

/**
 * Shell Ecme/Octor só depois do login por senha da API.
 * Sem SSO e sem AppMenu (gate no AppMenu + useCurrentSession sintético).
 */
export default function PanelShell({ children }: { children: ReactNode }) {
    const [authed, setAuthed] = useState<boolean | null>(null)

    useEffect(() => {
        const sync = () => {
            setAuthed(Boolean(window.localStorage.getItem(SQLITE_ADMIN_TOKEN_KEY)))
        }
        sync()
        window.addEventListener('storage', sync)
        window.addEventListener(SQLITE_ADMIN_AUTH_EVENT, sync)
        return () => {
            window.removeEventListener('storage', sync)
            window.removeEventListener(SQLITE_ADMIN_AUTH_EVENT, sync)
        }
    }, [])

    if (authed === null) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        )
    }

    if (!authed) {
        return <>{children}</>
    }

    return <PostLoginLayout>{children}</PostLoginLayout>
}
