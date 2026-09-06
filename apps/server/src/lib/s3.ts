import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing ${name}`)
  }
  return value
}

function getClient() {
  return new S3Client({
    region: requireEnv("AWS_REGION"),
    credentials: {
      accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
    },
  })
}

function bucket() {
  return requireEnv("S3_BUCKET_NAME")
}

export function projectSnapshotKey(userId: string, projectId: string) {
  return `users/${userId}/projects/${projectId}/snapshot.tar.gz`
}

export async function uploadSnapshot(
  key: string,
  body: Uint8Array | Buffer
) {
  const client = getClient()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: "application/gzip",
    })
  )
  return key
}

export async function downloadSnapshot(key: string): Promise<Uint8Array> {
  const client = getClient()
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
    })
  )
  if (!result.Body) {
    throw new Error("Empty S3 object body")
  }
  const bytes = await result.Body.transformToByteArray()
  return bytes
}
