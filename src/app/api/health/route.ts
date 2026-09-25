import { NextResponse } from 'next/server'

const SERVICE = process.env.OCTOR_SERVICE_NAME || 'template-frontend'

/** Alias legado → live. Preferir /api/health/live e /api/health/ready. */
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
