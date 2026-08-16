import 'server-only'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { queryDatabase } from '../database'
import { deleteObject, getObject, putObject } from '../storage'
import { hashContent } from '../security'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const MAX_INPUT_PIXELS = 28_000_000
const MAX_PHOTO_COUNT = 9

export async function createPhotoAsset(projectId: string, file: File) {
  if (!file.type.startsWith('image/')) throw new Error('只支持图片文件')
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error('单张图片必须小于 10 MB')
  }
  const countResult = await queryDatabase<{ count: string }>(
    `select count(*)::text as count from assets
      where project_id = $1 and kind = 'photo' and status = 'ready'`,
    [projectId],
  )
  if (Number(countResult.rows[0]?.count ?? 0) >= MAX_PHOTO_COUNT) {
    throw new Error('每座小院最多上传 9 张照片')
  }

  const input = Buffer.from(await file.arrayBuffer())
  const pipeline = sharp(input, {
    failOn: 'error',
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate()
  const metadata = await pipeline.metadata()
  if (!metadata.width || !metadata.height) throw new Error('无法读取图片尺寸')
  const output = await pipeline
    .resize({ width: 1_600, height: 1_600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer()
  const resultMetadata = await sharp(output).metadata()
  const id = randomUUID()
  const objectKey = `projects/${projectId}/photos/${id}.webp`
  await putObject(objectKey, output, 'image/webp')
  try {
    await queryDatabase(
      `insert into assets (
        id, project_id, kind, object_key, mime_type, byte_size,
        width, height, sha256, status
      ) values ($1, $2, 'photo', $3, 'image/webp', $4, $5, $6, $7, 'ready')`,
      [
        id,
        projectId,
        objectKey,
        output.byteLength,
        resultMetadata.width ?? null,
        resultMetadata.height ?? null,
        hashContent(output),
      ],
    )
  } catch (error) {
    await deleteObject(objectKey).catch(() => undefined)
    throw error
  }
  return { assetId: id, url: `/media/${id}` }
}

export async function deletePhotoAsset(projectId: string, assetId: string) {
  const published = await queryDatabase<{ referenced: boolean }>(
    `select exists (
       select 1 from projects p
       join project_revisions r on r.id = p.published_revision_id
       cross join lateral jsonb_array_elements(r.config->'gallery') photo
       where p.id = $1 and photo->>'assetId' = $2
     ) as referenced`,
    [projectId, assetId],
  )
  if (published.rows[0]?.referenced) {
    throw new Error('这张照片正在已发布版本中使用，请先撤下分享链接')
  }
  const result = await queryDatabase<{ object_key: string }>(
    `update assets set status = 'deleted'
      where id = $1 and project_id = $2 and status = 'ready'
      returning object_key`,
    [assetId, projectId],
  )
  const objectKey = result.rows[0]?.object_key
  if (!objectKey) return false
  await deleteObject(objectKey)
  return true
}

export async function loadAssetForDelivery(assetId: string) {
  const result = await queryDatabase<{
    object_key: string
    mime_type: string
    project_id: string
    publicly_available: boolean
  }>(
    `select a.object_key,
            a.mime_type,
            a.project_id,
            exists (
              select 1 from project_revisions r
              cross join lateral jsonb_array_elements(r.config->'gallery') photo
              where r.id = p.published_revision_id and photo->>'assetId' = a.id::text
            ) as publicly_available
       from assets a
       join projects p on p.id = a.project_id
      where a.id = $1 and a.status = 'ready'`,
    [assetId],
  )
  const asset = result.rows[0]
  if (!asset) return null
  return { ...asset, response: await getObject(asset.object_key) }
}
