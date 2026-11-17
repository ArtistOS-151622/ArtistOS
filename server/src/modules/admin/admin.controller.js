import * as adminService from "#src/modules/admin/admin.service.js"
import * as usersService from "#src/modules/admin/users.service.js"
import { badRequest } from "#src/utils/api-error.js"
import { bodyOf, queryParam } from "#src/utils/request.js"

const planId = (req) => {
  const id = parseInt(req.params.id, 10)
  if (Number.isNaN(id)) throw badRequest("Invalid ID")
  return id
}

export const stats = async (_req, res) => res.json(await adminService.getStats())
export const payments = async (_req, res) => res.json(await adminService.listPlatformPayments())
export const storage = async (_req, res) => res.json(await adminService.listStorageUsage())

export const getSettings = async (_req, res) => res.json(await adminService.getSettings())
export const updateSettings = async (req, res) => res.json(await adminService.updateSettings(bodyOf(req)))

export const listPlans = async (_req, res) => res.json(await adminService.listPlatformPlans())
export const createPlan = async (req, res) => res.json(await adminService.createPlatformPlan(bodyOf(req)))
export const updatePlan = async (req, res) => res.json(await adminService.updatePlatformPlan(planId(req), bodyOf(req)))
export const deletePlan = async (req, res) => res.json(await adminService.deletePlatformPlan(planId(req)))

export const listStoragePlans = async (_req, res) => res.json(await adminService.listStoragePlans())
export const updateStoragePlan = async (req, res) => res.json(await adminService.updateStoragePlan(bodyOf(req)))

export const listTickets = async (_req, res) => res.json(await adminService.listTickets())
export const setTicketStatus = async (req, res) => res.json(await adminService.setTicketStatus(req.params.id, bodyOf(req).status))
export const ticketMessages = async (req, res) => res.json(await adminService.listTicketMessages(req.params.id))
export const replyToTicket = async (req, res) => res.json(await adminService.replyToTicket(req.params.id, bodyOf(req).message))

export const listUsers = async (_req, res) => res.json(await usersService.listUsers())
export const updateUser = async (req, res) => res.json(await usersService.updateUser(bodyOf(req)))
export const sendDeleteOtp = async (_req, res) => res.json(await usersService.sendDeleteOtp())

/** DELETE /api/admin/users: id + otp from the query string, or else the JSON body. */
export async function deleteUser(req, res) {
  const queryId = queryParam(req, "id")
  const { id, otp } = queryId ? { id: queryId, otp: queryParam(req, "otp") } : bodyOf(req)
  res.json(await usersService.deleteUser(id, otp))
}
