import { NextResponse } from 'next/server'
import { publishProject, unpublishProject } from '@/server/projects/projectService'
import { requireProjectEditor } from '@/server/session'
import { protectWriteRequest } from '@/server/requestProtection'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: RouteContext<'/api/projects/[projectId]/publish'>,
) {
  try {
    const rejected = protectWriteRequest(request, 'publish', 30)
    if (rejected) return rejected
    const { projectId } = await context.params
    if (!(await requireProjectEditor(projectId))) {
      return NextResponse.json({ message: '编辑会话无效' }, { status: 401 })
    }
    const result = await publishProject(projectId)
    return result
      ? NextResponse.json({ ...result, shareUrl: `/s/${result.publicSlug}` })
      : NextResponse.json({ message: '项目不存在' }, { status: 404 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '发布失败' },
      { status: 400 },
    )
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/projects/[projectId]/publish'>,
) {
  const rejected = protectWriteRequest(request, 'unpublish', 30)
  if (rejected) return rejected
  const { projectId } = await context.params
  if (!(await requireProjectEditor(projectId))) {
    return NextResponse.json({ message: '编辑会话无效' }, { status: 401 })
  }
  return (await unpublishProject(projectId))
    ? new Response(null, { status: 204 })
    : NextResponse.json({ message: '项目不存在' }, { status: 404 })
}
