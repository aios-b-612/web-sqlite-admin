import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('AppMenu viewport scroll', () => {
  const src = readFileSync(resolve(__dirname, './AppMenu.tsx'), 'utf8')

  it('limita o painel à viewport e faz o grid rolar', () => {
    expect(src).toContain('max-h-[calc(100dvh-5.5rem)]')
    expect(src).toContain('overflow-y-auto')
    expect(src).toContain('overscroll-contain')
    expect(src).toContain('filterAppMenuItemsByQuery')
  })

  it('mostra busca quando a clínica tem mais apps do que cabem em 3 linhas', () => {
    expect(src).toContain('APP_MENU_SEARCH_THRESHOLD = 9')
    expect(src).toContain('Buscar app')
  })
})
