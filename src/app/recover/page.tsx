import Link from 'next/link'
import { RecoverForm } from '@/features/creator-studio/RecoverForm'

export const metadata = { title: '找回花园', robots: { index: false, follow: false } }

export default function RecoverPage() {
  return <main className="create-page"><Link className="create-page__brand" href="/">LOVE</Link><div className="create-page__glow" aria-hidden="true" /><RecoverForm /></main>
}
