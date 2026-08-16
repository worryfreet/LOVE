import { NextResponse } from 'next/server'
import { archiveProject } from '@/server/projects/projectService'
import { protectWriteRequest } from '@/server/requestProtection'
import { requireProjectEditor } from '@/server/session'
import { deleteObject } from '@/server/storage'

export const runtime = 'nodejs'

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/projects/[projectId]'>,
) {
  const rejected = protectWriteRequest(request, 'delete-project', 5, 60 * 60 * 1_000)
  if (rejected) return rejected
  const { projectId } = await context.params
  if (!(await requireProjectEditor(projectId))) {
    return NextResponse.json({ message: '编辑会话无效' }, { status: 401 })
  }
  const objectKeys = await archiveProject(projectId)
  await Promise.allSettled(objectKeys.map((key) => deleteObject(key)))
  return new Response(null, { status: 204 })
}
