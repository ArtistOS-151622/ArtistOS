import { S3Client } from "@aws-sdk/client-s3"

let client: S3Client | null = null

function readR2Env(name: string): string | undefined {
  const value = process.env[name]?.trim().replace(/^["']|["']$/g, "")
  return value || undefined
}

export function getR2Client(): S3Client {
  if (client) return client

  const accountId = readR2Env("R2_ACCOUNT_ID")
  const accessKeyId = readR2Env("R2_ACCESS_KEY_ID")
  const secretAccessKey = readR2Env("R2_SECRET_ACCESS_KEY")

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials are not configured")
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  })

  return client
}

export function getR2BucketName(): string {
  const bucket = readR2Env("R2_BUCKET_NAME")
  if (!bucket) throw new Error("R2_BUCKET_NAME is not configured")
  return bucket
}
