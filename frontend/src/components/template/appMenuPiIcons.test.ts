import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Chaves `icon` do `web-auth` `app_menu_registry.json` (produção).
 * Se o registry ganhar um `tb:*` novo, este teste falha até o mapa acompanhar.
 */
const WEB_AUTH_REGISTRY_ICON_KEYS = [
  'tb:user-circle',
  'tb:message',
  'tb:building',
  'tb:briefcase',
  'tb:phone',
  'tb:mail',
  'tb:ticket',
  'tb:shopping-cart',
  'tb:microphone',
  'tb:bell',
  'tb:clipboard-list',
  'tb:flask',
  'tb:calendar',
  'tb:package',
  'tb:code',
  'tb:cash',
  'tb:mood-smile',
  'tb:device-tv',
  'tb:database-import',
  'tb:database-export',
  'tb:calculator',
  'tb:search',
  'tb:link',
  'tb:world-www',
  'tb:file-pencil',
  'tb:device-mobile',
  'tb:help-circle',
] as const

describe('appMenuPiIcons', () => {
  const src = readFileSync(resolve(__dirname, './appMenuPiIcons.tsx'), 'utf8')

  it('usa Tabler (tb), não só Phosphor (pi)', () => {
    expect(src).toContain("from 'react-icons/tb'")
    expect(src).toContain('TbCalendar')
    expect(src).toContain('TbCode')
  })

  it('mapeia todas as chaves tb:* do registry do web-auth', () => {
    for (const key of WEB_AUTH_REGISTRY_ICON_KEYS) {
      expect(src, `falta ${key} — AppMenu cairia no ícone genérico`).toContain(
        `'${key}'`,
      )
    }
  })
})
