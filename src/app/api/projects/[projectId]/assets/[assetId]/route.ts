import { NextResponse } from 'next/server'
import { deletePhotoAsset } from '@/server/projects/assetService'
import { requireProjectEditor } from '@/server/session'
import { protectWriteRequest } from '@/server/requestProtection'

export const runtime = 'nodejs'

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/projects/[projectId]/assets/[assetId]'>,
) {
  const rejected = protectWriteRequest(request, 'delete-asset', 30)
  if (rejected) return rejected
  const { projectId, assetId } = await context.params
  if (!(await requireProjectEditor(projectId))) {
    return NextResponse.json({ message: '编辑会话无效' }, { status: 401 })
  }
  try {
    return (await deletePhotoAsset(projectId, assetId))
      ? new Response(null, { status: 204 })
      : NextResponse.json({ message: '图片不存在' }, { status: 404 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '图片删除失败' },
      { status: 409 },
    )
  }
}
