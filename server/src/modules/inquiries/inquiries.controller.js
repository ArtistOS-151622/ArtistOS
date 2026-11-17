import * as inquiriesService from "#src/modules/inquiries/inquiries.service.js"
import { badRequest } from "#src/utils/api-error.js"
import { bodyOf, queryParam } from "#src/utils/request.js"

/** Same rule as before: any finite number (missing rows are a 404). */
const inquiryId = (req) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) throw badRequest("Invalid inquiry id.")
  return id
}

export async function list(req, res) {
  res.json(
    await inquiriesService.listInquiries(req.artist.id, {
      search: queryParam(req, "search")?.trim() || "",
      status: queryParam(req, "status")?.trim() || "all",
      page: Math.max(1, Number(queryParam(req, "page")) || 1),
    })
  )
}

export async function counts(req, res) {
  res.json(await inquiriesService.countPending(req.artist.id))
}

export async function getFormLink(req, res) {
  res.json(await inquiriesService.getFormLink(req.artist.id))
}

export async function activateFormLink(req, res) {
  res.json(await inquiriesService.activateFormLink(req.artist.id))
}

export async function convert(req, res) {
  res.json(await inquiriesService.convertInquiry(req.artist.id, inquiryId(req)))
}

export async function cancel(req, res) {
  res.json(await inquiriesService.cancelInquiry(req.artist.id, inquiryId(req)))
}

export async function getPublicForm(req, res) {
  res.json(await inquiriesService.getPublicForm(req.params.code))
}

export async function submitPublicInquiry(req, res) {
  res.json(await inquiriesService.submitPublicInquiry(req.params.code, bodyOf(req)))
}
