import Link from 'next/link'
import { CreateProjectForm } from '@/features/creator-studio/CreateProjectForm'

export const metadata = {
  title: '定制你的花海小院',
  robots: { index: false, follow: false },
}

export default function CreatePage() {
  return (
    <main className="create-page">
      <Link className="create-page__brand" href="/">LOVE</Link>
      <div className="create-page__glow" aria-hidden="true" />
      <CreateProjectForm />
      <p className="create-page__privacy">照片和文字只用于生成你的礼物，可随时撤下或删除。</p>
    </main>
  )
}
