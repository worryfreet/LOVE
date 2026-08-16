import QRCode from 'qrcode'
import { getSiteUrl } from '@/server/environment'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url')
  if (!raw) return new Response(null, { status: 400 })
  const target = new URL(raw)
  const site = new URL(getSiteUrl())
  if (target.origin !== site.origin || !target.pathname.startsWith('/s/')) {
    return new Response(null, { status: 400 })
  }
  const svg = await QRCode.toString(target.href, {
    type: 'svg',
    margin: 1,
    width: 280,
    color: { dark: '#24171aff', light: '#fff8efff' },
  })
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
