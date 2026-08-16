import 'server-only'
import { cookies } from 'next/headers'
import { createOpaqueToken, hashSecret } from './security'
import { queryDatabase } from './database'

const EDIT_SESSION_COOKIE = 'love_editor_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export async function createEditSession(projectId: string) {
  const token = createOpaqueToken()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1_000)
  await queryDatabase(
    `insert into edit_sessions (token_hash, project_id, expires_at)
     values ($1, $2, $3)`,
    [hashSecret(token), projectId, expiresAt],
  )
  const store = await cookies()
  store.set(EDIT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function getEditorProjectId() {
  const token = (await cookies()).get(EDIT_SESSION_COOKIE)?.value
  if (!token) return null
  const result = await queryDatabase<{ project_id: string }>(
    `update edit_sessions
       set last_used_at = now()
     where token_hash = $1 and expires_at > now()
     returning project_id`,
    [hashSecret(token)],
  )
  return result.rows[0]?.project_id ?? null
}

export async function requireProjectEditor(projectId: string) {
  return (await getEditorProjectId()) === projectId
}
