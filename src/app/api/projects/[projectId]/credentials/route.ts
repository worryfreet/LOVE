import { NextResponse } from 'next/server'
import { rotateProjectCredentials } from '@/server/projects/projectService'
import { protectWriteRequest } from '@/server/requestProtection'
import { createEditSession, requireProjectEditor } from '@/server/session'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: RouteContext<'/api/projects/[projectId]/credentials'>,
) {
  const rejected = protectWriteRequest(request, 'rotate-credentials', 5, 60 * 60 * 1_000)
  if (rejected) return rejected
  const { projectId } = await context.params
  if (!(await requireProjectEditor(projectId))) {
    return NextResponse.json({ message: '编辑会话无效' }, { status: 401 })
  }
  const result = await rotateProjectCredentials(projectId)
  if (result) await createEditSession(projectId)
  return result
    ? NextResponse.json({
        claimUrl: `/claim/${result.editSecret}`,
        recoveryCode: result.recoveryCode,
      })
    : NextResponse.json({ message: '项目不存在' }, { status: 404 })
}
