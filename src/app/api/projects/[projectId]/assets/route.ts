import { NextResponse } from 'next/server'
import { createPhotoAsset } from '@/server/projects/assetService'
import { requireProjectEditor } from '@/server/session'
import { protectWriteRequest } from '@/server/requestProtection'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: RouteContext<'/api/projects/[projectId]/assets'>,
) {
  const rejected = protectWriteRequest(request, 'upload-asset', 30, 60 * 60 * 1_000)
  if (rejected) return rejected
  const { projectId } = await context.params
  if (!(await requireProjectEditor(projectId))) {
    return NextResponse.json({ message: '编辑会话无效' }, { status: 401 })
  }
  const form = await request.formData()
  const file = form.get('file')
  const replaceAssetId = form.get('replaceAssetId')
  if (!(file instanceof File)) {
    return NextResponse.json({ message: '请选择图片文件' }, { status: 400 })
  }
  if (replaceAssetId !== null && typeof replaceAssetId !== 'string') {
    return NextResponse.json({ message: '替换照片参数无效' }, { status: 400 })
  }
  try {
    return NextResponse.json(
      await createPhotoAsset(projectId, file, replaceAssetId || undefined),
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '图片上传失败' },
      { status: 400 },
    )
  }
}
