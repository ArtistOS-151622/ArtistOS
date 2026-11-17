import * as servicesService from "#src/modules/services/services.service.js"
import { badRequest } from "#src/utils/api-error.js"
import { bodyOf, parsePositiveId, queryParam } from "#src/utils/request.js"

const serviceId = (req) => {
  const id = parsePositiveId(req.params.id)
  if (!id) throw badRequest("Invalid service id.")
  return id
}

export async function list(req, res) {
  res.json(
    await servicesService.listServices(req.artist.id, {
      search: queryParam(req, "search")?.trim() || "",
      sort: queryParam(req, "sort")?.trim() || "all",
    })
  )
}

export async function create(req, res) {
  res.json(await servicesService.createService(req.artist.id, bodyOf(req)))
}

export async function update(req, res) {
  const id = serviceId(req)
  res.json(await servicesService.updateService(req.artist.id, id, bodyOf(req)))
}

export async function remove(req, res) {
  res.json(await servicesService.deleteService(req.artist.id, serviceId(req)))
}
