export function buildPublicUrl(path: string, siteUrl: string) {
  return new URL(path, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`)
}
