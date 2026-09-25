import { Metadata } from 'next'

const pageMeta: Metadata = {
    title: 'Octor',
    description: 'Plataforma Octor',
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/icons/icon.svg', type: 'image/svg+xml' },
            { url: '/favicon.png', type: 'image/png' },
        ],
        apple: '/icons/apple-touch-icon.png',
    },
}

export default pageMeta
