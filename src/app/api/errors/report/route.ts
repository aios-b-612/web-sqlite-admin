import { NextRequest, NextResponse } from 'next/server'

/**
 * FE → API de negócio (sem credencial Loki no browser).
 * Defina BUSINESS_API_INTERNAL_URL no compose (ex. http://octor-web-foo-api:PORT).
 * Sem URL: aceita e descarta (204) para não quebrar scaffold local.
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const base = (process.env.BUSINESS_API_INTERNAL_URL || '').replace(/\/$/, '')

  if (!base) {
    return new NextResponse(null, { status: 204 })
  }

  try {
    const upstream = await fetch(`${base}/v1/errors/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const text = await upstream.text()
    return new NextResponse(text || null, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json(
      { status: false, message: 'error report upstream unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
