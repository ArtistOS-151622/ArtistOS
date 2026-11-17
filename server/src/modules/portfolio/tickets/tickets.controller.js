import * as ticketsService from "#src/modules/portfolio/tickets/tickets.service.js"
import { sendPortfolio } from "#src/shared/portfolio/response.js"
import { bodyOf } from "#src/utils/request.js"

export async function list(req, res) {
  sendPortfolio(res, "Tickets loaded", await ticketsService.listTickets(req.artist.id))
}

export async function create(req, res) {
  sendPortfolio(res, "Ticket created successfully", await ticketsService.createTicket(req.artist.id, bodyOf(req)), 201)
}

export async function messages(req, res) {
  sendPortfolio(res, "Messages loaded", await ticketsService.listMessages(req.artist.id, req.params.id))
}

export async function reply(req, res) {
  sendPortfolio(res, "Reply sent successfully", await ticketsService.reply(req.artist.id, req.params.id, bodyOf(req).message), 201)
}
