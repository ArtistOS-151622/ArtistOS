import { Router } from "express"

import * as controller from "#src/modules/portfolio/files/files.controller.js"
import { singleFileUpload } from "#src/modules/portfolio/files/upload-middleware.js"

/** Mounted at /api/portfolio/files (auth + envelope errors applied by the parent). */
export const filesRouter = Router()

filesRouter.post("/upload", singleFileUpload("file", "File is required"), controller.upload)
filesRouter.post("/bulk-delete", controller.bulkDelete)
filesRouter.post("/bulk-download", controller.bulkDownload)
filesRouter.delete("/:id", controller.remove)
filesRouter.put("/:id/rename", controller.rename)
filesRouter.get("/:id/download", controller.download)
filesRouter.post("/:id/compress", controller.compress)
filesRouter.post("/:id/crop", singleFileUpload("image", "image file is required"), controller.crop)
