import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolveLoveExperienceConfig } from '@/domain/loveProjectConfig'
import { GardenStageClient } from '@/features/garden-experience/GardenStageClient'
import { getPublishedProject } from '@/server/projects/projectService'

export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const project = await getPublishedProject(slug)
  if (!project) return { title: '这座花园暂时没有开放', robots: { index: false } }
  const { identity } = project.config
  const title = identity.giftTitle || '为你种下的一座花园'
  return {
    title,
    description: `${identity.senderName} 为 ${identity.recipientName} 准备了一座可以亲自走进的花园。`,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: '有一座花园，正在等你打开。',
      type: 'website',
      images: [{ url: `/s/${slug}/opengraph-image`, width: 1200, height: 630 }],
    },
  }
}

export default async function SharedGardenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getPublishedProject(slug)
  if (!project) notFound()
  const { identity } = project.config
  return (
    <main className="experience-page shared-page">
      <GardenStageClient config={resolveLoveExperienceConfig(project.config, project.photos)} mode="guest" />
      <header className="experience-brand"><strong>LOVE</strong><span>{identity.giftTitle}</span></header>
      <p className="shared-dedication">TO {identity.recipientName || 'YOU'}<small>FROM {identity.senderName || 'SOMEONE WHO LOVES YOU'}</small></p>
    </main>
  )
}
