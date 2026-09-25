import { NextResponse } from 'next/server'

const SERVICE = process.env.OCTOR_SERVICE_NAME || 'template-frontend'

/**
 * Readiness — neste template FE-only sempre ok.
 * Em app dual, preferir health na API e Traefik PathPrefix(/health) nela.
 */
export async function GET() {
  return NextResponse.json(
    { status: 'ok', service: SERVICE },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  )
}
