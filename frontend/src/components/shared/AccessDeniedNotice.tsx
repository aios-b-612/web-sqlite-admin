'use client'

import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import appConfig from '@/configs/app.config'
import { TbLock } from 'react-icons/tb'

type AccessDeniedNoticeProps = {
  onSignOut?: () => void
  reason?: string
}

/**
 * Autenticado sem entitlement. Não faz logout automático.
 */
const AccessDeniedNotice = ({ onSignOut, reason }: AccessDeniedNoticeProps) => {
  const portal = appConfig.authPortalOrigin.trim()

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-lg p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <TbLock className="text-5xl text-amber-500" />
          <h1 className="text-xl font-semibold">Sem acesso</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Sua conta está autenticada, mas não tem permissão para usar este
            aplicativo. Owners acessam pelo plano da empresa; colaboradores
            Octor precisam impersonar o cliente; funcionários só entram com
            permissão explícita.
          </p>
          {reason ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Motivo: {reason}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {portal ? (
              <Button
                variant="solid"
                onClick={() => {
                  window.location.href = portal
                }}
              >
                Ir ao portal
              </Button>
            ) : null}
            {onSignOut ? (
              <Button variant="plain" onClick={onSignOut}>
                Sair
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default AccessDeniedNotice
