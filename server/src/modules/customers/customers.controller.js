import * as customersService from "#src/modules/customers/customers.service.js"
import { badRequest } from "#src/utils/api-error.js"
import { bodyOf, parsePositiveId, queryParam } from "#src/utils/request.js"

const customerId = (req) => {
  const id = parsePositiveId(req.params.id)
  if (!id) throw badRequest("Invalid customer id.")
  return id
}

export async function list(req, res) {
  res.json(
    await customersService.listCustomers(req.artist.id, {
      search: queryParam(req, "search")?.trim() || "",
      sort: queryParam(req, "sort")?.trim() || "recent",
      page: Math.max(1, Number(queryParam(req, "page")) || 1),
      limit: Number(queryParam(req, "limit")) || 0,
    })
  )
}

export async function create(req, res) {
  res.json(await customersService.createCustomer(req.artist.id, bodyOf(req)))
}

export async function update(req, res) {
  const id = customerId(req)
  res.json(await customersService.updateCustomer(req.artist.id, id, bodyOf(req)))
}

export async function remove(req, res) {
  res.json(await customersService.deleteCustomer(req.artist.id, customerId(req)))
}
