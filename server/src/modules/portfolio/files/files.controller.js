import * as filesService from "#src/modules/portfolio/files/files.service.js"
import { portfolioError, sendPortfolio } from "#src/shared/portfolio/response.js"
import { bodyOf } from "#src/utils/request.js"

const fileId = (req) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) throw portfolioError("Invalid file ID", 400)
  return id
}

export async function upload(req, res) {
  const file = req.file
    ? { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size }
    : null
  sendPortfolio(res, "File uploaded successfully", await filesService.uploadFile(req.artist.id, file, bodyOf(req)), 201)
}

export async function remove(req, res) {
  sendPortfolio(res, "File deleted", await filesService.deleteFile(req.artist.id, fileId(req)))
}

export async function rename(req, res) {
  // No NaN check here, as before.
  const id = Number(req.params.id)
  sendPortfolio(res, "File renamed", await filesService.rename(req.artist.id, id, bodyOf(req).original_name))
}

export async function download(req, res) {
  sendPortfolio(res, "Download URL generated", await filesService.getDownloadUrl(req.artist.id, Number(req.params.id)))
}

export async function bulkDelete(req, res) {
  const [message, data] = await filesService.bulkDelete(req.artist.id, bodyOf(req).ids)
  sendPortfolio(res, message, data)
}

export async function bulkDownload(req, res) {
  const zip = await filesService.prepareBulkDownload(req.artist.id, bodyOf(req).ids)
  res.set({ "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="portfolio-files.zip"' })
  try {
    await zip.pipeTo(res)
  } catch (err) {
    // Headers (and possibly data) are already sent: abort so the client sees a failed download.
    req.log.error({ err }, "bulk download failed mid-stream")
    res.destroy(err)
  }
}

export async function compress(req, res) {
  sendPortfolio(res, "Image compressed", await filesService.compressImage(req.artist.id, Number(req.params.id), bodyOf(req).quality))
}

export async function crop(req, res) {
  sendPortfolio(res, "Image cropped", await filesService.cropImage(req.artist.id, Number(req.params.id), req.file?.buffer ?? null))
}
