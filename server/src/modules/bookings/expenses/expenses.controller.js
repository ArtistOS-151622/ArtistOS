import * as service from "#src/modules/bookings/expenses/expenses.service.js"
import { bodyOf, queryParam } from "#src/utils/request.js"
import { parseBookingId } from "#src/modules/bookings/guards.js"

export async function list(req, res) {
  res.json(await service.listExpenses(req.artist.id, parseBookingId(req)))
}

export async function create(req, res) {
  const bookingId = parseBookingId(req)
  res.status(201).json(await service.addExpense(req.artist.id, bookingId, bodyOf(req)))
}

export async function update(req, res) {
  const bookingId = parseBookingId(req)
  res.json(await service.updateExpense(req.artist.id, bookingId, bodyOf(req)))
}

export async function remove(req, res) {
  const bookingId = parseBookingId(req)
  res.json(await service.deleteExpense(req.artist.id, bookingId, queryParam(req, "expenseId")))
}
