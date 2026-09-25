import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('DropdownMenu viewport size', () => {
  const src = readFileSync(resolve(__dirname, './DropdownMenu.tsx'), 'utf8')

  it('usa middleware size() para não deixar o menu sair da tela', () => {
    expect(src).toContain('size({')
    expect(src).toContain('availableHeight')
    expect(src).toContain('data-dropdown-menu')
    expect(src).toContain("overflowY = 'auto'")
  })
})
