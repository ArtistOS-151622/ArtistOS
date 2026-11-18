import { PutObjectCommand } from "@aws-sdk/client-s3"

import { config } from "#src/config/env.js"
import { getR2BucketName, getR2Client } from "#src/integrations/r2/client.js"
import { createDbClient } from "#src/integrations/supabase.js"
import { assertWritable } from "#src/shared/subscription/read-only.js"
import { ApiError, badRequest } from "#src/utils/api-error.js"
import { logger } from "#src/utils/logger.js"

const log = logger.child({ feature: "whatsapp-templates" })

const DEFAULT_LANGUAGE = "English"

/** The artist's own templates plus the system ones (user_id IS NULL). */
export async function listTemplates(userId) {
  const { data, error } = await createDbClient()
    .from("whatsapp_templates")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("id", { ascending: true })

  if (error) {
    log.error({ error: error.message }, "fetch templates failed")
    throw new ApiError(500, "Failed to fetch templates")
  }
  return { templates: data }
}

export async function createTemplate(userId, body) {
  const { title, content, image_url, language } = body
  if (!title || !content) throw badRequest("Title and content are required")

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to create templates.")

  const { data, error } = await supabase
    .from("whatsapp_templates")
    .insert({ user_id: userId, title, content, language: language || DEFAULT_LANGUAGE, image_url })
    .select()
    .single()

  if (error) {
    log.error({ error: error.message }, "create template failed")
    throw new ApiError(500, "Failed to create template")
  }
  return { template: data }
}

/** Only the artist's own templates can be deleted (system templates have no user_id). */
export async function deleteTemplate(userId, templateId) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to delete templates.")

  const { error } = await supabase.from("whatsapp_templates").delete().eq("id", templateId).eq("user_id", userId)
  if (error) {
    log.error({ error: error.message }, "delete template failed")
    throw new ApiError(500, "Failed to delete template")
  }
  return { success: true }
}

/** Stores a broadcast image in R2 and returns its public URL. The file is validated by the upload middleware. */
export async function uploadTemplateImage(userId, file) {
  const ext = file.originalname.split(".").pop() || "jpg"
  const key = `broadcasts/${userId}/${Date.now()}.${ext}`

  try {
    await getR2Client().send(
      new PutObjectCommand({ Bucket: getR2BucketName(), Key: key, Body: file.buffer, ContentType: file.mimetype })
    )
  } catch (err) {
    throw new ApiError(500, err instanceof Error ? err.message : "Upload failed", { cause: err })
  }

  // Checked after the upload, as before (the object is orphaned if this is missing).
  const publicDomain = config.r2.publicUrl?.replace(/\/$/, "")
  if (!publicDomain) throw new ApiError(500, "R2_PUBLIC_URL not configured")

  return { url: `${publicDomain}/${key}` }
}
