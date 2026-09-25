import type { AxiosError } from 'axios'

export type ErrorPayload = {
  type: string
  message: string
  stack?: string
  context?: Record<string, unknown>
}

export type ErrorReportBody = {
  type: string
  message: string
  stack?: string
  page: string
  environment: string
  context?: Record<string, unknown>
}

const DEDUP_WINDOW_MS = 60_000
const REPORT_PATH = '/api/errors/report'
const MAX_MESSAGE_LEN = 1000
const MAX_STACK_LEN = 1500

const recentErrorKeys = new Map<string, number>()
const AUTH_HTTP_STATUSES = new Set([401, 419, 440])

function buildDedupKey(payload: ErrorPayload): string {
  const context = payload.context ?? {}
  const contextKey = Object.entries(context)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${String(value)}`)
    .join('|')
  return [payload.type, payload.message, contextKey].join('::')
}

function shouldSkipDuplicate(key: string, now = Date.now()): boolean {
  const lastSentAt = recentErrorKeys.get(key)
  if (lastSentAt != null && now - lastSentAt < DEDUP_WINDOW_MS) {
    return true
  }
  recentErrorKeys.set(key, now)
  for (const [storedKey, sentAt] of recentErrorKeys) {
    if (now - sentAt >= DEDUP_WINDOW_MS) {
      recentErrorKeys.delete(storedKey)
    }
  }
  return false
}

function sanitizeApiPath(url: string | undefined): string | undefined {
  if (!url) return undefined
  return (url.split('?')[0]?.split('#')[0] ?? url).slice(0, 300)
}

export function shouldReportAxiosError(error: AxiosError): boolean {
  if (error.code === 'ERR_CANCELED') return false
  const status = error.response?.status
  if (status != null && AUTH_HTTP_STATUSES.has(status)) return false
  if (sanitizeApiPath(error.config?.url)?.includes('/errors/report')) {
    return false
  }
  return true
}

export function buildErrorReportBody(payload: ErrorPayload): ErrorReportBody {
  const body: ErrorReportBody = {
    type: payload.type,
    message: payload.message?.slice(0, MAX_MESSAGE_LEN) ?? '',
    page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    environment: process.env.NODE_ENV || 'development',
  }
  if (payload.stack) body.stack = payload.stack.slice(0, MAX_STACK_LEN)
  if (payload.context && Object.keys(payload.context).length > 0) {
    body.context = payload.context
  }
  return body
}

/** Reporta via BFF Next → API → Loki. Sem credencial no browser. */
export async function reportError(payload: ErrorPayload): Promise<void> {
  const dedupKey = buildDedupKey(payload)
  if (shouldSkipDuplicate(dedupKey)) return
  try {
    await fetch(REPORT_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildErrorReportBody(payload)),
      keepalive: true,
    })
  } catch {
    // Observabilidade nunca quebra a UI.
  }
}

export async function reportAxiosError(error: AxiosError): Promise<void> {
  if (!shouldReportAxiosError(error)) return
  const status = error.response?.status
  await reportError({
    type: 'axios-response',
    message: [error.message, status != null ? `HTTP ${status}` : 'Sem resposta']
      .filter(Boolean)
      .join(' — '),
    stack: error.stack,
    context: {
      method: error.config?.method?.toUpperCase(),
      apiPath: sanitizeApiPath(error.config?.url),
      status: status ?? null,
      axiosCode: error.code ?? null,
    },
  })
}
