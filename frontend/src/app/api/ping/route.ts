import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
  
  try {
    const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(10000) })
    const data = await res.json()
    return NextResponse.json({ ok: true, backend: res.status, data })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 })
  }
}
