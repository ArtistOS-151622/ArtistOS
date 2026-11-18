import { Router } from "express"
import multer from "multer"

import * as templatesService from "#src/modules/whatsapp/templates.service.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { createDbClient } from "#src/integrations/supabase.js"
import { assertWritable } from "#src/shared/subscription/read-only.js"
import { badRequest } from "#src/utils/api-error.js"
import { bodyOf } from "#src/utils/request.js"

const TEMPLATE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const IMAGE_ONLY_MESSAGE = "Only image files are allowed"
const IMAGE_TOO_LARGE_MESSAGE = "Image must be under 5MB"
const NO_FILE_MESSAGE = "No file provided"

/**
 * One in-memory "file" field. The type is checked before the size, as in the
 * Next.js route, so a large non-image still reports "Only image files are allowed".
 */
const parseTemplateImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TEMPLATE_IMAGE_MAX_BYTES + 1, files: 1 },
  defParamCharset: "utf8",
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(badRequest(IMAGE_ONLY_MESSAGE)),
}).single("file")

function templateImageUpload(req, res, next) {
  parseTemplateImage(req, res, (err) => {
    if (!err) return next()
    if (err.code === "LIMIT_FILE_SIZE") return next(badRequest(IMAGE_TOO_LARGE_MESSAGE))
    if (err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT") return next(badRequest(NO_FILE_MESSAGE))
    next(err.status ? err : badRequest(err.message || "Invalid upload"))
  })
}

/** Mounted at /api/whatsapp: the artist's WhatsApp broadcast templates. */
export const whatsappRouter = Router()

whatsappRouter.use(requireArtist)

whatsappRouter.get("/templates", async (req, res) => {
  res.json(await templatesService.listTemplates(req.artist.id))
})

whatsappRouter.post("/templates", async (req, res) => {
  res.json(await templatesService.createTemplate(req.artist.id, bodyOf(req)))
})

whatsappRouter.post(
  "/templates/upload",
  async (req, _res, next) => {
    // Read-only is checked before the body is read, as before.
    await assertWritable(
      createDbClient(),
      req.artist.id,
      "Your subscription has expired. Please upgrade to upload template images."
    )
    next()
  },
  templateImageUpload,
  async (req, res) => {
    if (!req.file) throw badRequest(NO_FILE_MESSAGE)
    if (req.file.size > TEMPLATE_IMAGE_MAX_BYTES) throw badRequest(IMAGE_TOO_LARGE_MESSAGE)
    res.json(await templatesService.uploadTemplateImage(req.artist.id, req.file))
  }
)

whatsappRouter.delete("/templates/:id", async (req, res) => {
  const templateId = Number(req.params.id)
  if (!templateId) throw badRequest("Invalid template ID")
  res.json(await templatesService.deleteTemplate(req.artist.id, templateId))
})
