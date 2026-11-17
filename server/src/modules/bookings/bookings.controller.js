import * as bookingsService from "#src/modules/bookings/bookings.service.js"
import { parseBookingId } from "#src/modules/bookings/guards.js"
import { bodyOf, queryParam } from "#src/utils/request.js"

const requestContext = (req) => ({ requestId: req.bookingRequestId, log: req.log })

export async function list(req, res) {
  res.json(
    await bookingsService.listBookings(req.artist.id, {
      search: queryParam(req, "search") ?? "",
      status: queryParam(req, "status")?.trim() || "all",
      startDate: queryParam(req, "start_date") ?? "",
      endDate: queryParam(req, "end_date") ?? "",
    })
  )
}

export async function counts(req, res) {
  res.json(
    await bookingsService.countBookingsByDate(req.artist.id, {
      startDate: queryParam(req, "start_date"),
      endDate: queryParam(req, "end_date"),
      status: queryParam(req, "status"),
    })
  )
}

export async function create(req, res) {
  res.json(await bookingsService.createBooking(req.artist.id, bodyOf(req), requestContext(req)))
}

export async function update(req, res) {
  const id = parseBookingId(req)
  res.json(await bookingsService.updateBooking(req.artist.id, id, bodyOf(req), requestContext(req)))
}

export async function remove(req, res) {
  res.json(await bookingsService.deleteBooking(req.artist.id, parseBookingId(req)))
}

export async function detail(req, res) {
  res.json(await bookingsService.getBookingDetail(req.artist.id, parseBookingId(req)))
}

export async function discount(req, res) {
  const id = parseBookingId(req)
  res.json(await bookingsService.updateDiscount(req.artist.id, id, bodyOf(req).discount))
}

export async function services(req, res) {
  const id = parseBookingId(req)
  res.json(await bookingsService.syncBookingServices(req.artist.id, id, bodyOf(req).services))
}

export async function whatsappReminder(req, res) {
  res.json(await bookingsService.sendWhatsAppReminder(req.artist.id, parseBookingId(req)))
}
