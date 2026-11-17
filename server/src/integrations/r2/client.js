import { S3Client } from "@aws-sdk/client-s3"

import { config } from "#src/config/env.js"

let client = null

/** Cloudflare R2 via the S3-compatible API. Never Supabase Storage. */
export function getR2Client() {
  if (client) return client

  const { accountId, accessKeyId, secretAccessKey } = config.r2
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

export function getR2BucketName() {
  if (!config.r2.bucketName) throw new Error("R2_BUCKET_NAME is not configured")
  return config.r2.bucketName
}
