import { ImageResponse } from 'next/og'
import { getPublishedProject } from '@/server/projects/projectService'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getPublishedProject(slug)
  const identity = project?.config.identity
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, color: '#fff7e8', background: 'radial-gradient(circle at 70% 70%, #925f68 0%, #372b38 38%, #111827 76%)' }}>
      <div style={{ display: 'flex', fontSize: 52, letterSpacing: '0.24em', fontFamily: 'serif' }}>LOVE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', fontSize: 26, opacity: 0.72 }}>一座只为重要的人盛开的花园</div>
        <div style={{ display: 'flex', fontSize: 66, lineHeight: 1.15, maxWidth: 920, fontFamily: 'serif' }}>{identity?.giftTitle || '有一座花园，正在等你打开'}</div>
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: '0.12em', opacity: 0.76 }}>{identity ? `${identity.senderName}  →  ${identity.recipientName}` : 'OPEN THE GARDEN'}</div>
      </div>
    </div>,
    size,
  )
}
