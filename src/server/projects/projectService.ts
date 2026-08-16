import 'server-only'
import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import {
  DEFAULT_LOVE_PROJECT_CONFIG,
  loveProjectConfigSchema,
  normalizeLoveProjectConfig,
  type LoveProjectConfig,
  type ResolvedLovePhoto,
} from '@/domain/loveProjectConfig'
import { queryDatabase, withTransaction } from '../database'
import {
  createOpaqueToken,
  createPublicSlug,
  createRecoveryCode,
  hashSecret,
} from '../security'

interface ProjectRow {
  id: string
  public_slug: string
  status: 'draft' | 'published' | 'archived'
  draft_config: unknown
  draft_version: number
  published_revision_id: string | null
}

interface AssetRow {
  id: string
  object_key: string
  mime_type: string
  width: number | null
  height: number | null
}

export interface EditableProject {
  id: string
  publicSlug: string
  status: ProjectRow['status']
  config: LoveProjectConfig
  version: number
  published: boolean
  photos: ResolvedLovePhoto[]
}

async function createUniqueSlug(client: PoolClient) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = createPublicSlug()
    const existing = await client.query('select 1 from projects where public_slug = $1', [slug])
    if (existing.rowCount === 0) return slug
  }
  throw new Error('无法生成唯一分享短码')
}

export async function createProject(initial?: Partial<LoveProjectConfig>) {
  const id = randomUUID()
  const editSecret = createOpaqueToken()
  const recoveryCode = createRecoveryCode()
  const defaults = structuredClone(DEFAULT_LOVE_PROJECT_CONFIG)
  const config = loveProjectConfigSchema.parse({
    ...defaults,
    ...initial,
    identity: { ...defaults.identity, ...initial?.identity },
    letter: { ...defaults.letter, ...initial?.letter },
    ambience: { ...defaults.ambience, ...initial?.ambience },
    garden: { ...defaults.garden, ...initial?.garden },
    interior: { ...defaults.interior, ...initial?.interior },
    schemaVersion: 1,
  })

  const publicSlug = await withTransaction(async (client) => {
    const slug = await createUniqueSlug(client)
    await client.query(
      `insert into projects (
        id, public_slug, status, edit_secret_hash, recovery_code_hash,
        draft_config, draft_version
      ) values ($1, $2, 'draft', $3, $4, $5, 1)`,
      [id, slug, hashSecret(editSecret), hashSecret(recoveryCode), config],
    )
    return slug
  })

  return { id, publicSlug, editSecret, recoveryCode, config }
}

async function loadPhotoAssets(projectId: string) {
  const result = await queryDatabase<AssetRow>(
    `select id, object_key, mime_type, width, height
       from assets
      where project_id = $1 and status = 'ready' and kind = 'photo'
      order by created_at asc`,
    [projectId],
  )
  return result.rows.map((asset) => ({
    assetId: asset.id,
    url: `/media/${asset.id}`,
  }))
}

export async function getEditableProject(projectId: string): Promise<EditableProject | null> {
  const result = await queryDatabase<ProjectRow>(
    `select id, public_slug, status, draft_config, draft_version, published_revision_id
       from projects where id = $1 and status <> 'archived'`,
    [projectId],
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id,
    publicSlug: row.public_slug,
    status: row.status,
    config: normalizeLoveProjectConfig(row.draft_config),
    version: row.draft_version,
    published: Boolean(row.published_revision_id),
    photos: await loadPhotoAssets(row.id),
  }
}

export async function updateProjectDraft(
  projectId: string,
  configValue: unknown,
  expectedVersion: number,
) {
  const config = loveProjectConfigSchema.parse(configValue)
  const result = await queryDatabase<{ draft_version: number }>(
    `update projects
        set draft_config = $1,
            draft_version = draft_version + 1,
            updated_at = now()
      where id = $2 and draft_version = $3 and status <> 'archived'
      returning draft_version`,
    [config, projectId, expectedVersion],
  )
  if (!result.rows[0]) return null
  return { config, version: result.rows[0].draft_version }
}

export async function publishProject(projectId: string) {
  return withTransaction(async (client) => {
    const projectResult = await client.query<ProjectRow>(
      `select id, public_slug, status, draft_config, draft_version, published_revision_id
         from projects where id = $1 and status <> 'archived' for update`,
      [projectId],
    )
    const project = projectResult.rows[0]
    if (!project) return null
    const config = normalizeLoveProjectConfig(project.draft_config)
    const referencedAssets = config.gallery.map((item) => item.assetId)
    if (referencedAssets.length) {
      const assetResult = await client.query<{ count: string }>(
        `select count(*)::text as count from assets
          where project_id = $1 and status = 'ready' and id = any($2::uuid[])`,
        [projectId, referencedAssets],
      )
      if (Number(assetResult.rows[0]?.count ?? 0) !== new Set(referencedAssets).size) {
        throw new Error('草稿中有照片尚未上传完成，请重新选择后再发布')
      }
    }
    const revisionId = randomUUID()
    const numberResult = await client.query<{ next_number: number }>(
      `select coalesce(max(revision_number), 0) + 1 as next_number
         from project_revisions where project_id = $1`,
      [projectId],
    )
    await client.query(
      `insert into project_revisions (id, project_id, revision_number, config)
       values ($1, $2, $3, $4)`,
      [revisionId, projectId, numberResult.rows[0].next_number, config],
    )
    await client.query(
      `update projects
          set status = 'published', published_revision_id = $1, updated_at = now()
        where id = $2`,
      [revisionId, projectId],
    )
    return { publicSlug: project.public_slug, revisionId }
  })
}

export async function unpublishProject(projectId: string) {
  const result = await queryDatabase(
    `update projects
        set status = 'draft', published_revision_id = null, updated_at = now()
      where id = $1 and status <> 'archived'`,
    [projectId],
  )
  return (result.rowCount ?? 0) > 0
}

export async function getPublishedProject(slug: string) {
  const result = await queryDatabase<{
    id: string
    public_slug: string
    config: unknown
  }>(
    `select p.id, p.public_slug, r.config
       from projects p
       join project_revisions r on r.id = p.published_revision_id
      where p.public_slug = $1 and p.status = 'published'`,
    [slug],
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id,
    publicSlug: row.public_slug,
    config: normalizeLoveProjectConfig(row.config),
    photos: await loadPhotoAssets(row.id),
  }
}

export async function findProjectByEditSecret(secret: string) {
  const result = await queryDatabase<{ id: string }>(
    `select id from projects
      where edit_secret_hash = $1 and status <> 'archived'`,
    [hashSecret(secret)],
  )
  return result.rows[0]?.id ?? null
}

export async function findProjectByRecoveryCode(code: string) {
  const result = await queryDatabase<{ id: string }>(
    `select id from projects
      where recovery_code_hash = $1 and status <> 'archived'`,
    [hashSecret(code.trim().toUpperCase())],
  )
  return result.rows[0]?.id ?? null
}

export async function rotateProjectCredentials(projectId: string) {
  const editSecret = createOpaqueToken()
  const recoveryCode = createRecoveryCode()
  return withTransaction(async (client) => {
    const result = await client.query(
      `update projects
          set edit_secret_hash = $1, recovery_code_hash = $2, updated_at = now()
        where id = $3 and status <> 'archived'`,
      [hashSecret(editSecret), hashSecret(recoveryCode), projectId],
    )
    if (!(result.rowCount ?? 0)) return null
    await client.query('delete from edit_sessions where project_id = $1', [projectId])
    return { editSecret, recoveryCode }
  })
}

export async function archiveProject(projectId: string) {
  return withTransaction(async (client) => {
    const assets = await client.query<{ object_key: string }>(
      `select object_key from assets
        where project_id = $1 and status = 'ready' for update`,
      [projectId],
    )
    const archived = await client.query(
      `update projects
          set status = 'archived', published_revision_id = null, updated_at = now()
        where id = $1 and status <> 'archived'`,
      [projectId],
    )
    if (!(archived.rowCount ?? 0)) return []
    await client.query(
      `update assets set status = 'deleted'
        where project_id = $1 and status = 'ready'`,
      [projectId],
    )
    await client.query('delete from edit_sessions where project_id = $1', [projectId])
    return assets.rows.map((row) => row.object_key)
  })
}
