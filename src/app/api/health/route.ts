import { NextResponse } from 'next/server'
import { queryDatabase } from '@/server/database'
import { checkStorage } from '@/server/storage'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await Promise.all([queryDatabase('select 1'), checkStorage()])
    return NextResponse.json({ status: 'ok', database: 'ok', storage: 'ok' })
  } catch {
    return NextResponse.json(
      { status: 'degraded', dependencies: 'unavailable' },
      { status: 503 },
    )
  }
}
