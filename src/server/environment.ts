import 'server-only'

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`缺少服务器环境变量 ${name}`)
  return value
}

export function getServerEnvironment() {
  return {
    siteUrl: getSiteUrl(),
    databaseUrl: required('DATABASE_URL'),
    sessionSecret: required('SESSION_SECRET'),
    s3: {
      endpoint: required('S3_ENDPOINT'),
      region: process.env.S3_REGION?.trim() || 'auto',
      bucket: required('S3_BUCKET'),
      accessKeyId: required('S3_ACCESS_KEY_ID'),
      secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    },
  }
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000'
}
