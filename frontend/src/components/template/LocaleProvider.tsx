'use client'
import { useEffect } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { dateLocales } from '@/i18n/dateLocales'
import dayjs from 'dayjs'

import type { AbstractIntlMessages } from 'next-intl'

function resolveClientTimeZone(): string {
    try {
        return (
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            'America/Sao_Paulo'
        )
    } catch {
        return 'America/Sao_Paulo'
    }
}

type LocaleProvider = {
    messages: AbstractIntlMessages
    children: React.ReactNode
    locale: string
}

const LocaleProvider = ({ messages, children, locale }: LocaleProvider) => {
    useEffect(() => {
        dateLocales[locale]().then(() => {
            dayjs.locale(locale)
        })
    }, [locale])

    return (
        <NextIntlClientProvider
            messages={messages}
            locale={locale}
            timeZone={resolveClientTimeZone()}
        >
            {children}
        </NextIntlClientProvider>
    )
}

export default LocaleProvider
