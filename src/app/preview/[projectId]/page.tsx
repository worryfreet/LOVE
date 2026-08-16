import Link from 'next/link'
import { notFound } from 'next/navigation'
import { resolveLoveExperienceConfig } from '@/domain/loveProjectConfig'
import { GardenStageClient } from '@/features/garden-experience/GardenStageClient'
import { getEditableProject } from '@/server/projects/projectService'
import { requireProjectEditor } from '@/server/session'

export const metadata = { title: '访客预览', robots: { index: false, follow: false } }

export default async function PreviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  if (!(await requireProjectEditor(projectId))) notFound()
  const project = await getEditableProject(projectId)
  if (!project) notFound()
  return (
    <main className="experience-page">
      <GardenStageClient config={resolveLoveExperienceConfig(project.config, project.photos)} mode="preview" />
      <header className="experience-brand"><strong>LOVE</strong><span>访客预览 · 尚未公开</span></header>
      <Link className="preview-back" href={`/studio/${projectId}`}>返回编辑</Link>
    </main>
  )
}
