import 'server-only'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getServerEnvironment } from './environment'

let client: S3Client | null = null

function getStorage() {
  const environment = getServerEnvironment()
  if (!client) {
    client = new S3Client({
      endpoint: environment.s3.endpoint,
      region: environment.s3.region,
      forcePathStyle: environment.s3.forcePathStyle,
      credentials: {
        accessKeyId: environment.s3.accessKeyId,
        secretAccessKey: environment.s3.secretAccessKey,
      },
    })
  }
  return { client, bucket: environment.s3.bucket }
}

export async function putObject(
  objectKey: string,
  body: Uint8Array,
  contentType: string,
) {
  const storage = getStorage()
  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
      CacheControl: 'private, max-age=300',
    }),
  )
}

export async function getObject(objectKey: string) {
  const storage = getStorage()
  return storage.client.send(
    new GetObjectCommand({ Bucket: storage.bucket, Key: objectKey }),
  )
}

export async function deleteObject(objectKey: string) {
  const storage = getStorage()
  await storage.client.send(
    new DeleteObjectCommand({ Bucket: storage.bucket, Key: objectKey }),
  )
}

export async function checkStorage() {
  const storage = getStorage()
  await storage.client.send(new HeadBucketCommand({ Bucket: storage.bucket }))
}
