import * as service from "#src/modules/bookings/portfolio-tags/portfolio-tags.service.js"
import { portfolioError, sendPortfolio } from "#src/shared/portfolio/response.js"

export async function get(req, res) {
  const bookingId = Number(req.params.id)
  if (Number.isNaN(bookingId)) throw portfolioError("Invalid booking ID", 400)
  sendPortfolio(res, "Booking portfolio loaded", await service.getBookingPortfolio(req.artist.id, bookingId))
}

export async function create(req, res) {
  // No NaN check here, as before: a non-numeric id simply isn't found.
  const bookingId = Number(req.params.id)
  sendPortfolio(res, "Booking folder ready", await service.createBookingFolder(req.artist.id, bookingId), 201)
}
