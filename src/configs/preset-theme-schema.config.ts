export type Variables =
    | 'primary'
    | 'primaryDeep'
    | 'primaryMild'
    | 'primarySubtle'
    | 'neutral'

export type ThemeVariables = Record<'light' | 'dark', Record<Variables, string>>

/** Verde Octor — primary canônico. Não usar o azul Ecme (`#2a85ff`) como default. */
export const OCTOR_PRIMARY = '#0CAF60'
export const OCTOR_PRIMARY_DEEP = '#088d50'
export const OCTOR_PRIMARY_MILD = '#34c779'
export const OCTOR_PRIMARY_SUBTLE = '#0CAF601a'

const octorGreen: ThemeVariables = {
    light: {
        primary: OCTOR_PRIMARY,
        primaryDeep: OCTOR_PRIMARY_DEEP,
        primaryMild: OCTOR_PRIMARY_MILD,
        primarySubtle: OCTOR_PRIMARY_SUBTLE,
        neutral: '#ffffff',
    },
    dark: {
        primary: OCTOR_PRIMARY,
        primaryDeep: OCTOR_PRIMARY_DEEP,
        primaryMild: OCTOR_PRIMARY_MILD,
        primarySubtle: OCTOR_PRIMARY_SUBTLE,
        neutral: '#ffffff',
    },
}

const darkTheme: ThemeVariables = {
    light: {
        primary: '#18181b',
        primaryDeep: '#09090b',
        primaryMild: '#27272a',
        primarySubtle: '#18181b0d',
        neutral: '#ffffff',
    },
    dark: {
        primary: '#ffffff',
        primaryDeep: '#09090b',
        primaryMild: '#e5e7eb',
        primarySubtle: '#ffffff1a',
        neutral: '#111827',
    },
}

const blueTheme: ThemeVariables = {
    light: {
        primary: '#2a85ff',
        primaryDeep: '#0069f6',
        primaryMild: '#4996ff',
        primarySubtle: '#2a85ff1a',
        neutral: '#ffffff',
    },
    dark: {
        primary: '#2a85ff',
        primaryDeep: '#0069f6',
        primaryMild: '#4996ff',
        primarySubtle: '#2a85ff1a',
        neutral: '#ffffff',
    },
}

const purpleTheme: ThemeVariables = {
    light: {
        primary: '#8C62FF',
        primaryDeep: '#704acc',
        primaryMild: '#a784ff',
        primarySubtle: '#8C62FF1a',
        neutral: '#ffffff',
    },
    dark: {
        primary: '#8C62FF',
        primaryDeep: '#704acc',
        primaryMild: '#a784ff',
        primarySubtle: '#8C62FF1a',
        neutral: '#ffffff',
    },
}

const orangeTheme: ThemeVariables = {
    light: {
        primary: '#fb732c',
        primaryDeep: '#cc5c24',
        primaryMild: '#fc8f56',
        primarySubtle: '#fb732c1a',
        neutral: '#ffffff',
    },
    dark: {
        primary: '#fb732c',
        primaryDeep: '#cc5c24',
        primaryMild: '#fc8f56',
        primarySubtle: '#fb732c1a',
        neutral: '#ffffff',
    },
}

const presetThemeSchemaConfig: Record<string, ThemeVariables> = {
    default: octorGreen,
    dark: darkTheme,
    green: octorGreen,
    greenTheme: octorGreen,
    purple: purpleTheme,
    orange: orangeTheme,
    blue: blueTheme,
}

export default presetThemeSchemaConfig
