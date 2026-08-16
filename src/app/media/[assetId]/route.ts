import { loadAssetForDelivery } from '@/server/projects/assetService'
import { getEditorProjectId } from '@/server/session'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: RouteContext<'/media/[assetId]'>,
) {
  const { assetId } = await context.params
  const asset = await loadAssetForDelivery(assetId)
  if (!asset) return new Response(null, { status: 404 })
  if (!asset.publicly_available && (await getEditorProjectId()) !== asset.project_id) {
    return new Response(null, { status: 404 })
  }
  const body = asset.response.Body
  if (!body) return new Response(null, { status: 404 })
  return new Response(body.transformToWebStream(), {
    headers: {
      'Content-Type': asset.mime_type,
      'Cache-Control': asset.publicly_available
        ? 'public, max-age=300, stale-while-revalidate=60'
        : 'private, no-store',
    },
  })
}
