import { NextResponse } from 'next/server'
import { getPublishedProject } from '@/server/projects/projectService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: RouteContext<'/api/public/[slug]'>) {
  const { slug } = await context.params
  const project = await getPublishedProject(slug)
  if (!project) return NextResponse.json({ message: '花园不存在或已撤下' }, { status: 404 })
  return NextResponse.json(
    { publicSlug: project.publicSlug, config: project.config, photos: project.photos },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
