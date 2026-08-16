import { NextResponse } from 'next/server'
import { getEditableProject, updateProjectDraft } from '@/server/projects/projectService'
import { requireProjectEditor } from '@/server/session'
import { protectWriteRequest } from '@/server/requestProtection'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: RouteContext<'/api/projects/[projectId]/draft'>,
) {
  const { projectId } = await context.params
  if (!(await requireProjectEditor(projectId))) {
    return NextResponse.json({ message: '编辑会话无效' }, { status: 401 })
  }
  const project = await getEditableProject(projectId)
  return project
    ? NextResponse.json(project)
    : NextResponse.json({ message: '项目不存在' }, { status: 404 })
}

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/projects/[projectId]/draft'>,
) {
  try {
    const rejected = protectWriteRequest(request, 'save-draft', 120)
    if (rejected) return rejected
    const { projectId } = await context.params
    if (!(await requireProjectEditor(projectId))) {
      return NextResponse.json({ message: '编辑会话无效' }, { status: 401 })
    }
    if (Number(request.headers.get('content-length') ?? 0) > 1_000_000) {
      return NextResponse.json({ message: '草稿内容过大' }, { status: 413 })
    }
    const body = await request.json().catch(() => null)
    if (!body || !Number.isInteger(body.version)) {
      return NextResponse.json({ message: '草稿版本无效' }, { status: 400 })
    }
    const result = await updateProjectDraft(projectId, body.config, body.version)
    return result
      ? NextResponse.json(result)
      : NextResponse.json(
          { message: '草稿已在其他窗口更新，请刷新后重试' },
          { status: 409 },
        )
  } catch {
    return NextResponse.json({ message: '草稿内容无效' }, { status: 400 })
  }
}
