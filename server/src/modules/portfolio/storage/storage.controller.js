import { getStorageInfo } from "#src/modules/portfolio/storage/storage.service.js"
import { sendPortfolio } from "#src/shared/portfolio/response.js"

export async function info(req, res) {
  sendPortfolio(res, "Storage info loaded", await getStorageInfo(req.artist.id))
}
