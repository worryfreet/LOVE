import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CreatorStudio } from '@/features/creator-studio/CreatorStudio'
import { getEditableProject } from '@/server/projects/projectService'
import { requireProjectEditor } from '@/server/session'

export const metadata = { title: '创作工作台', robots: { index: false, follow: false } }

export default async function StudioPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  if (!(await requireProjectEditor(projectId))) {
    return (
      <main className="access-page">
        <p className="eyebrow">PRIVATE GARDEN</p>
        <h1>需要管理链接才能继续编辑</h1>
        <p>请在创建时保存的私密管理链接中打开，或使用恢复码找回。</p>
        <div><Link className="primary-action" href="/recover">使用恢复码</Link><Link href="/create">重新创建</Link></div>
      </main>
    )
  }
  const project = await getEditableProject(projectId)
  if (!project) notFound()
  return <CreatorStudio initialProject={project} />
}
