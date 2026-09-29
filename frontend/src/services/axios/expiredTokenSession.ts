/** Aviso único quando a API devolve token inválido. */
export const EXPIRED_TOKEN_USER_MESSAGE =
    'Este login foi encerrado. Faça login novamente.'

export const EXPIRED_TOKEN_REASON = 'token_expired'

const STORAGE_KEY = 'octor_auth_reason'

let noticeShown = false

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

/**
 * Corpo `{ success: false, message: "Unauthorized", error: "Invalid token" }`
 * (e a mesma forma com `status: false`).
 */
export function isInvalidTokenPayload(payload: unknown): boolean {
    if (!isRecord(payload)) {
        return false
    }
    const denied = payload.success === false || payload.status === false
    if (!denied) {
        return false
    }
    const error =
        typeof payload.error === 'string' ? payload.error.trim().toLowerCase() : ''
    return error === 'invalid token'
}

export function rememberExpiredTokenReason(): void {
    if (typeof window === 'undefined') {
        return
    }
    try {
        sessionStorage.setItem(STORAGE_KEY, EXPIRED_TOKEN_REASON)
    } catch {
        /* storage indisponível */
    }
}

export function peekExpiredTokenReason(): boolean {
    if (typeof window === 'undefined') {
        return false
    }
    try {
        return sessionStorage.getItem(STORAGE_KEY) === EXPIRED_TOKEN_REASON
    } catch {
        return false
    }
}

/** Acrescenta prompt=login e reason na URL do portal, uma vez por login encerrado. */
export function appendExpiredTokenLoginParams(url: string): string {
    if (!peekExpiredTokenReason() || typeof window === 'undefined') {
        return url
    }
    try {
        const parsed = new URL(url, window.location.origin)
        parsed.searchParams.set('prompt', 'login')
        parsed.searchParams.set('reason', EXPIRED_TOKEN_REASON)
        if (/^https?:\/\//i.test(url)) {
            return parsed.toString()
        }
        return `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
        return url
    }
}

function showExpiredTokenNoticeOnce(): void {
    if (noticeShown) {
        return
    }
    noticeShown = true
    rememberExpiredTokenReason()
    if (typeof document === 'undefined') {
        return
    }
    if (document.getElementById('octor-expired-token-notice')) {
        return
    }

    const overlay = document.createElement('div')
    overlay.id = 'octor-expired-token-notice'
    overlay.setAttribute('role', 'alert')
    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:2147483647',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'background:rgba(15,23,42,.55)',
        'padding:24px',
        'font-family:system-ui,sans-serif',
    ].join(';')

    const card = document.createElement('div')
    card.style.cssText = [
        'max-width:420px',
        'width:100%',
        'background:#fff',
        'color:#0f172a',
        'border-radius:12px',
        'padding:24px',
        'box-shadow:0 20px 50px rgba(0,0,0,.25)',
    ].join(';')

    const title = document.createElement('h2')
    title.textContent = 'Sessão encerrada'
    title.style.cssText = 'margin:0 0 8px;font-size:1.25rem;'

    const text = document.createElement('p')
    text.textContent = EXPIRED_TOKEN_USER_MESSAGE
    text.style.cssText = 'margin:0 0 16px;line-height:1.5;'

    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Fazer login'
    button.style.cssText = [
        'background:#0f172a',
        'color:#fff',
        'border:0',
        'border-radius:8px',
        'padding:10px 16px',
        'font:inherit',
        'cursor:pointer',
    ].join(';')
    button.addEventListener('click', () => {
        const params = new URLSearchParams({
            prompt: 'login',
            reason: EXPIRED_TOKEN_REASON,
        })
        window.location.assign(`/sign-in?${params.toString()}`)
    })

    card.append(title, text, button)
    overlay.append(card)
    document.body.append(overlay)
}

export function notifyIfInvalidTokenPayload(payload: unknown): boolean {
    if (!isInvalidTokenPayload(payload)) {
        return false
    }
    showExpiredTokenNoticeOnce()
    return true
}
