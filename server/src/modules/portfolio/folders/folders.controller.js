import * as foldersService from "#src/modules/portfolio/folders/folders.service.js"
import { portfolioError, sendPortfolio } from "#src/shared/portfolio/response.js"
import { bodyOf, queryParam } from "#src/utils/request.js"

const folderId = (req) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) throw portfolioError("Invalid folder ID", 400)
  return id
}

export async function list(req, res) {
  const [message, data] = await foldersService.getFolders(req.artist.id, {
    uuid: queryParam(req, "uuid"),
    folderId: queryParam(req, "folder_id"),
    section: queryParam(req, "section"),
    search: queryParam(req, "search") ?? undefined,
    sort: queryParam(req, "sort") ?? undefined,
  })
  sendPortfolio(res, message, data)
}

export async function create(req, res) {
  sendPortfolio(res, "Folder created", await foldersService.createFolder(req.artist.id, bodyOf(req)), 201)
}

export async function update(req, res) {
  const id = folderId(req)
  sendPortfolio(res, "Folder updated", await foldersService.updateFolder(req.artist.id, id, bodyOf(req)))
}

export async function remove(req, res) {
  sendPortfolio(res, "Folder deleted", await foldersService.deleteFolder(req.artist.id, folderId(req)))
}

export async function toggleShare(req, res) {
  const id = folderId(req)
  const [message, data] = await foldersService.setSharing(req.artist.id, id, bodyOf(req))
  sendPortfolio(res, message, data)
}
