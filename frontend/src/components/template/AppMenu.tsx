'use client'

import { useMemo, useState } from 'react'
import Dropdown from '@/components/ui/Dropdown'
import { Tooltip } from '@/components/ui'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { PiDotsNineBold } from 'react-icons/pi'
import { TbSearch } from 'react-icons/tb'
import { renderAppMenuPiIcon } from './appMenuPiIcons'
import { buildAppMenuHandoffUrl } from '@/auth/appMenuHandoff'
import { filterAppMenuItemsByQuery } from './filterAppMenuItemsByQuery'
import { useOctorAuthStore } from '@/store/octorAuthStore'
import appConfig from '@/configs/app.config'
import type { AccountAppItem } from '@/auth/account'

/** A partir de 4 linhas no grid 3 colunas, busca + scroll evitam o menu sair da tela. */
const APP_MENU_SEARCH_THRESHOLD = 9

/** Fallback se o middleware `size()` do Dropdown não aplicar (viewport − header). */
const APP_MENU_PANEL_CLASS =
  '!p-4 !min-w-[320px] max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain'

/**
 * AppMenu: lista já filtrada em GET /v1/account → user.apps (web-auth).
 * Painel limitado à viewport, com scroll e busca quando a clínica tem muitos apps.
 */
const _AppMenu = () => {
  const apps = useOctorAuthStore((s) => s.user.apps) as
    | AccountAppItem[]
    | undefined
  const token = useOctorAuthStore((s) => s.token)
  const accountLoaded = useOctorAuthStore((s) => s.accountLoaded)
  const [query, setQuery] = useState('')

  // Sidecar hosting: sem SSO / sem AppMenu (pedido de produto).
  if (appConfig.panelPasswordAuth || !appConfig.centralAuthEnabled) {
    return null
  }

  const visibleItems = useMemo(() => {
    if (!accountLoaded) return null
    return [...(apps ?? [])].sort((a, b) => {
      const ao = a.order ?? 999
      const bo = b.order ?? 999
      if (ao !== bo) return ao - bo
      return a.id.localeCompare(b.id)
    })
  }, [accountLoaded, apps])

  const filteredItems = useMemo(() => {
    if (visibleItems === null) return null
    return filterAppMenuItemsByQuery(visibleItems, query)
  }, [visibleItems, query])

  const showSearch = (visibleItems?.length ?? 0) > APP_MENU_SEARCH_THRESHOLD

  return (
    <Dropdown
      className="flex"
      toggleClassName="flex items-center"
      renderTitle={
        <Tooltip title="Octor Apps">
          <div
            className="cursor-pointer flex items-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors duration-200"
            aria-label="Octor Apps"
          >
            <PiDotsNineBold className="text-2xl text-gray-700 dark:text-gray-300" />
          </div>
        </Tooltip>
      }
      placement="bottom-end"
      menuClass={APP_MENU_PANEL_CLASS}
      onOpen={(open) => {
        if (!open) {
          setQuery('')
        }
      }}
    >
      <div className="space-y-4">
        {showSearch ? (
          <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-gray-100 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-gray-900">
            <label className="relative block">
              <span className="sr-only">Buscar aplicativo</span>
              <TbSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-gray-400" />
              <input
                type="search"
                value={query}
                autoComplete="off"
                placeholder="Buscar app…"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
        ) : null}
        {visibleItems === null ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 px-1">
            Carregando aplicativos…
          </p>
        ) : null}
        {visibleItems !== null && visibleItems.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 px-1">
            Nenhum aplicativo disponível para o seu plano.
          </p>
        ) : null}
        {filteredItems !== null &&
        visibleItems !== null &&
        visibleItems.length > 0 &&
        filteredItems.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 px-1">
            Nenhum aplicativo encontrado para &quot;{query.trim()}&quot;.
          </p>
        ) : null}
        {filteredItems !== null && filteredItems.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {filteredItems.map((app) => (
              <a
                key={app.id}
                href={buildAppMenuHandoffUrl(app.href, token)}
                target={app.openInNewTab ? '_blank' : undefined}
                rel={app.openInNewTab ? 'noopener noreferrer' : undefined}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-200 group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-2xl mb-2 border-2 border-transparent group-hover:border-green-500 group-hover:text-green-600 dark:group-hover:text-green-400 group-hover:scale-105 transition-all duration-200">
                  {renderAppMenuPiIcon(app.icon)}
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300 text-center leading-tight font-semibold">
                  {app.name}
                </span>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </Dropdown>
  )
}

const AppMenu = withHeaderItem(_AppMenu)

export default AppMenu
