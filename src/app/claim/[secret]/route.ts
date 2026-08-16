import { NextResponse } from 'next/server'
import { findProjectByEditSecret } from '@/server/projects/projectService'
import { createEditSession } from '@/server/session'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: RouteContext<'/claim/[secret]'>,
) {
  const { secret } = await context.params
  const projectId = await findProjectByEditSecret(secret)
  if (!projectId) return NextResponse.redirect(new URL('/create?claim=invalid', request.url))
  await createEditSession(projectId)
  return NextResponse.redirect(new URL(`/studio/${projectId}`, request.url))
}
