import { NextResponse } from 'next/server'

const SERVICE = process.env.OCTOR_SERVICE_NAME || 'template-frontend'

/** Liveness — processo up; sem MySQL/Redis/I/O externo. */
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
