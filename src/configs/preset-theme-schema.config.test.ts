import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { themeConfig } from '@/configs/theme.config'
import presetThemeSchemaConfig, {
  OCTOR_PRIMARY,
  OCTOR_PRIMARY_DEEP,
  OCTOR_PRIMARY_MILD,
  OCTOR_PRIMARY_SUBTLE,
} from './preset-theme-schema.config'

const ECME_BLUE = '#2a85ff'

describe('marca Octor no tema default', () => {
  it('primary default é o verde Octor, não o azul Ecme', () => {
    expect(OCTOR_PRIMARY.toLowerCase()).toBe('#0caf60')
    expect(presetThemeSchemaConfig.default.light.primary).toBe(OCTOR_PRIMARY)
    expect(presetThemeSchemaConfig.default.dark.primary).toBe(OCTOR_PRIMARY)
    expect(presetThemeSchemaConfig.default.light.primary).not.toBe(ECME_BLUE)
    expect(presetThemeSchemaConfig.default.light.primaryDeep).toBe(
      OCTOR_PRIMARY_DEEP,
    )
    expect(presetThemeSchemaConfig.default.light.primaryMild).toBe(
      OCTOR_PRIMARY_MILD,
    )
    expect(presetThemeSchemaConfig.default.light.primarySubtle).toBe(
      OCTOR_PRIMARY_SUBTLE,
    )
  })

  it('aliases green/greenTheme apontam para o mesmo verde', () => {
    expect(presetThemeSchemaConfig.green).toBe(presetThemeSchemaConfig.default)
    expect(presetThemeSchemaConfig.greenTheme).toBe(
      presetThemeSchemaConfig.default,
    )
  })

  it('themeConfig nasce no schema default', () => {
    expect(themeConfig.themeSchema).toBe('default')
  })

  it('CSS :root e .dark usam o verde Octor no first paint', () => {
    const css = readFileSync(
      resolve(__dirname, '../assets/styles/tailwind/index.css'),
      'utf8',
    )
    expect(css).toMatch(/:root\s*\{[^}]*--primary:\s*#0CAF60/i)
    expect(css).toMatch(/\.dark\s*\{[^}]*--primary:\s*#0CAF60/i)
    expect(css).not.toMatch(/:root\s*\{[^}]*--primary:\s*#2a85ff/i)
  })
})
