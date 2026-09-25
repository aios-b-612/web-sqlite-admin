#!/usr/bin/env node
/**
 * Gate de build — apps Octor de produto exigem SSO web-auth no bundle.
 * Desligue com SKIP_BUILD_ENV_CHECK=1 só em scaffold local sem portal.
 */
const skip = process.env.SKIP_BUILD_ENV_CHECK === '1'
const centralOff = process.env.NEXT_PUBLIC_CENTRAL_AUTH_ENABLED === 'false'

if (skip || centralOff) {
  console.log('check-build-env: skipped (local scaffold ou CENTRAL_AUTH=false)')
  process.exit(0)
}

const required = [
  'NEXT_PUBLIC_AUTH_PORTAL_URL',
  'NEXT_PUBLIC_AUTH_API_URL',
]

const missing = required.filter((key) => !String(process.env[key] || '').trim())
if (missing.length) {
  console.error(
    `ERRO: build sem ${missing.join(', ')}. ` +
      'Passe via ARG/ENV no Dockerfile ou apps.json build.args. ' +
      'Ver docs/NOVO_APP.md.',
  )
  process.exit(1)
}

const portal = process.env.NEXT_PUBLIC_AUTH_PORTAL_URL
if (!/auth\.octor\.com\.br/i.test(portal) && process.env.NODE_ENV === 'production') {
  console.warn(
    `AVISO: NEXT_PUBLIC_AUTH_PORTAL_URL="${portal}" não aponta para auth.octor.com.br`,
  )
}

console.log('check-build-env: ok')
