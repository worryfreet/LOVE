import { NextResponse } from 'next/server'
import { createProject } from '@/server/projects/projectService'
import { createEditSession } from '@/server/session'
import { protectWriteRequest } from '@/server/requestProtection'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const rejected = protectWriteRequest(request, 'create-project', 10, 60 * 60 * 1_000)
    if (rejected) return rejected
    const body = await request.json().catch(() => ({}))
    const project = await createProject(body?.config)
    await createEditSession(project.id)
    return NextResponse.json(
      {
        projectId: project.id,
        publicSlug: project.publicSlug,
        claimUrl: `/claim/${project.editSecret}`,
        recoveryCode: project.recoveryCode,
        studioUrl: `/studio/${project.id}`,
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ message: '创建内容无效，请检查后重试' }, { status: 400 })
  }
}
