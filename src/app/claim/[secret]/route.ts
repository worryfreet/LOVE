import { NextResponse } from 'next/server'
import { findProjectByEditSecret } from '@/server/projects/projectService'
import { createEditSession } from '@/server/session'
import { getSiteUrl } from '@/server/environment'
import { buildPublicUrl } from '@/server/publicUrl'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: RouteContext<'/claim/[secret]'>,
) {
  const { secret } = await context.params
  const projectId = await findProjectByEditSecret(secret)
  const siteUrl = getSiteUrl()
  if (!projectId) {
    return NextResponse.redirect(buildPublicUrl('/create?claim=invalid', siteUrl))
  }
  await createEditSession(projectId)
  return NextResponse.redirect(buildPublicUrl(`/studio/${projectId}`, siteUrl))
}
