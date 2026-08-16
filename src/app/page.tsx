import Link from 'next/link'
import {
  DEFAULT_LOVE_PROJECT_CONFIG,
  resolveLoveExperienceConfig,
} from '@/domain/loveProjectConfig'
import { GardenStageClient } from '@/features/garden-experience/GardenStageClient'

export default function HomePage() {
  const config = resolveLoveExperienceConfig(DEFAULT_LOVE_PROJECT_CONFIG)

  return (
    <main className="experience-page">
      <GardenStageClient config={config} mode="demo" />
      <header className="experience-brand">
        <strong>LOVE</strong>
        <span>一座只为重要的人盛开的花园</span>
      </header>
      <div className="experience-action">
        <p>把名字、照片和想说的话，藏进这座小院。</p>
        <Link href="/create">定制这座花园</Link>
      </div>
    </main>
  )
}
