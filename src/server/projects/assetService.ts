import 'server-only'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { queryDatabase } from '../database'
import { deleteObject, getObject, putObject } from '../storage'
import { hashContent } from '../security'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const MAX_INPUT_PIXELS = 28_000_000
const MAX_PHOTO_COUNT = 9
const MAX_STORED_PHOTO_COUNT = MAX_PHOTO_COUNT * 2

const isPublishedAsset = async (projectId: string, assetId: string) => {
  const published = await queryDatabase<{ referenced: boolean }>(
    `select exists (
       select 1 from projects p
       join project_revisions r on r.id = p.published_revision_id
       cross join lateral jsonb_array_elements(r.config->'gallery') photo
       where p.id = $1 and photo->>'assetId' = $2
     ) as referenced`,
    [projectId, assetId],
  )
  return Boolean(published.rows[0]?.referenced)
}

const removeStoredAsset = async (projectId: string, assetId: string) => {
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

export async function createPhotoAsset(
  projectId: string,
  file: File,
  replaceAssetId?: string,
) {
  if (!file.type.startsWith('image/')) throw new Error('只支持图片文件')
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error('单张图片必须小于 10 MB')
  }
  const projectResult = await queryDatabase<{
    selected_count: number
    replacement_allowed: boolean
  }>(
    `select jsonb_array_length(coalesce(p.draft_config->'gallery', '[]'::jsonb)) as selected_count,
            case when $2::text is null then false else exists (
              select 1
                from jsonb_array_elements(coalesce(p.draft_config->'gallery', '[]'::jsonb)) photo
                join assets a on a.id::text = photo->>'assetId'
               where photo->>'assetId' = $2
                 and a.project_id = p.id
                 and a.kind = 'photo'
                 and a.status = 'ready'
            ) end as replacement_allowed
       from projects p
      where p.id = $1`,
    [projectId, replaceAssetId ?? null],
  )
  const project = projectResult.rows[0]
  if (!project) throw new Error('项目不存在')
  if (replaceAssetId && !project.replacement_allowed) {
    throw new Error('只能替换当前草稿中正在使用的照片')
  }
  if (!replaceAssetId && Number(project.selected_count) >= MAX_PHOTO_COUNT) {
    throw new Error('每座小院最多上传 9 张照片')
  }
  const countResult = await queryDatabase<{ count: string }>(
    `select count(*)::text as count from assets
      where project_id = $1 and kind = 'photo' and status = 'ready'`,
    [projectId],
  )
  const replacingPublishedAsset = replaceAssetId
    ? await isPublishedAsset(projectId, replaceAssetId)
    : false
  if (
    Number(countResult.rows[0]?.count ?? 0) >= MAX_STORED_PHOTO_COUNT
    && (!replaceAssetId || replacingPublishedAsset)
  ) {
    throw new Error('照片历史版本已满，请先撤下分享并恢复不需要的照片')
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
  if (await isPublishedAsset(projectId, assetId)) return true
  return removeStoredAsset(projectId, assetId)
}

export async function pruneInactivePhotoAssets(projectId: string) {
  const result = await queryDatabase<{ object_key: string }>(
    `update assets a
        set status = 'deleted'
       from projects p
      where a.project_id = p.id
        and p.id = $1
        and a.kind = 'photo'
        and a.status = 'ready'
        and not exists (
          select 1
            from jsonb_array_elements(coalesce(p.draft_config->'gallery', '[]'::jsonb)) photo
           where photo->>'assetId' = a.id::text
        )
        and not exists (
          select 1
            from project_revisions r
            cross join lateral jsonb_array_elements(coalesce(r.config->'gallery', '[]'::jsonb)) photo
           where r.id = p.published_revision_id
             and photo->>'assetId' = a.id::text
        )
      returning a.object_key`,
    [projectId],
  )
  await Promise.all(result.rows.map((row) => deleteObject(row.object_key).catch(() => undefined)))
  return result.rowCount ?? 0
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
