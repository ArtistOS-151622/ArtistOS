import { getSharedPortfolio } from "#src/modules/portfolio/shared-link.service.js"
import { sendPortfolio } from "#src/shared/portfolio/response.js"

export async function view(req, res) {
  sendPortfolio(res, "Shared portfolio loaded", await getSharedPortfolio(req.params.uuid))
}
