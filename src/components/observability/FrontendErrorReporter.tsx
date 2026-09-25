'use client'

import { useEffect } from 'react'
import { reportError } from '@/utils/errorReporter'

/**
 * Listeners globais → POST /api/errors/report → API → Loki.
 * Nunca envia senha Loki ao browser.
 */
const FrontendErrorReporter = () => {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void reportError({
        type: 'window-error',
        message: event.message || 'erro JavaScript',
        stack:
          event.error instanceof Error ? event.error.stack : undefined,
        context: {
          source: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      })
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      void reportError({
        type: 'unhandledrejection',
        message:
          reason instanceof Error
            ? reason.message
            : String(reason || 'promise rejeitada'),
        stack: reason instanceof Error ? reason.stack : undefined,
      })
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}

export default FrontendErrorReporter
