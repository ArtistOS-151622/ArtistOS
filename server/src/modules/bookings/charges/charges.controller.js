import * as service from "#src/modules/bookings/charges/charges.service.js"
import { bodyOf, queryParam } from "#src/utils/request.js"
import { parseBookingId } from "#src/modules/bookings/guards.js"

export async function create(req, res) {
  const bookingId = parseBookingId(req)
  res.status(201).json(await service.addCharge(req.artist.id, bookingId, bodyOf(req)))
}

export async function update(req, res) {
  const bookingId = parseBookingId(req)
  res.json(await service.updateCharge(req.artist.id, bookingId, bodyOf(req)))
}

export async function remove(req, res) {
  const bookingId = parseBookingId(req)
  res.json(await service.deleteCharge(req.artist.id, bookingId, queryParam(req, "chargeId")))
}
