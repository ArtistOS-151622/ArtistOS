import { getArtistSession } from "#src/middlewares/require-artist.js"
import { contentDisposition, PdfError, renderQuotation } from "#src/modules/bookings/pdf/pdf.service.js"

/**
 * GET /api/bookings/:id/pdf. Errors are plain text, not JSON (as before), so this
 * handler does its own auth check instead of requireArtist.
 */
export async function download(req, res) {
  try {
    const artist = getArtistSession(req)
    if (!artist) throw new PdfError(401, "Unauthorized")

    const bookingId = Number(req.params.id)
    if (Number.isNaN(bookingId)) throw new PdfError(400, "Booking ID is required")

    const { buffer, filename } = await renderQuotation(artist.id, bookingId)
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": contentDisposition(filename) })
    res.send(buffer)
  } catch (err) {
    if (err instanceof PdfError) {
      res.status(err.status).type("text/plain").send(err.message)
      return
    }
    req.log.error({ err }, "PDF generation failed")
    res.status(500).type("text/plain").send("Internal Server Error generating PDF")
  }
}
