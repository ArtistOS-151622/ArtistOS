import multer from "multer"

import { STORAGE_MAX_FILE_SIZE_BYTES } from "#src/shared/portfolio/config.js"
import { portfolioError } from "#src/shared/portfolio/response.js"

const MB = 1024 * 1024

/**
 * Multipart parser for one file field, held in memory (like the Next.js route's
 * formData()). One byte over the limit is accepted so the size check reports the
 * same message as before. Filenames are decoded as UTF-8 (multer's default is latin1).
 */
export function singleFileUpload(field, missingMessage) {
  const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: STORAGE_MAX_FILE_SIZE_BYTES + 1, files: 1 },
    defParamCharset: "utf8",
  }).single(field)

  return function uploadMiddleware(req, res, next) {
    parse(req, res, (err) => {
      if (!err) return next()
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(portfolioError(`File exceeds maximum size of ${STORAGE_MAX_FILE_SIZE_BYTES / MB} MB`, 400))
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT") {
        return next(portfolioError(missingMessage, 400))
      }
      next(portfolioError(err.message || "Invalid upload", 400))
    })
  }
}
