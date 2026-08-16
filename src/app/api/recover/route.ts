import { NextResponse } from 'next/server'
import { findProjectByRecoveryCode } from '@/server/projects/projectService'
import { protectWriteRequest } from '@/server/requestProtection'
import { createEditSession } from '@/server/session'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const rejected = protectWriteRequest(request, 'recover', 8, 60 * 60 * 1_000)
    if (rejected) return rejected
    const body = await request.json().catch(() => null)
    const code = typeof body?.code === 'string' ? body.code : ''
    const projectId = code ? await findProjectByRecoveryCode(code) : null
    if (!projectId) {
      return NextResponse.json({ message: '恢复码无效' }, { status: 404 })
    }
    await createEditSession(projectId)
    return NextResponse.json({ studioUrl: `/studio/${projectId}` })
  } catch {
    return NextResponse.json({ message: '恢复失败，请稍后重试' }, { status: 500 })
  }
}
