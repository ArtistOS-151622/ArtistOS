import { createDbClient } from "#src/integrations/supabase.js"
import { portfolioError } from "#src/shared/portfolio/response.js"
import { logger } from "#src/utils/logger.js"

const CLOSED_STATUSES = new Set(["resolved", "closed"])
const log = logger.child({ module: "support-tickets" })

/** Any database failure is logged and reported as a generic 500 (as before). */
async function orInternalError(what, work) {
  try {
    return await work()
  } catch (err) {
    if (err?.envelope) throw err
    log.error({ err }, `failed to ${what}`)
    throw portfolioError("Internal server error", 500)
  }
}

export function listTickets(userId) {
  return orInternalError("fetch tickets", async () => {
    const { data, error } = await createDbClient()
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) throw error
    return data
  })
}

/** Creates the ticket and its first message. → ticket row */
export function createTicket(userId, { subject, message, priority = "normal" }) {
  return orInternalError("create ticket", async () => {
    if (!subject || !message) throw portfolioError("Subject and message are required", 400)

    const supabase = createDbClient()
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({ user_id: userId, subject, priority })
      .select()
      .single()
    if (error) throw error

    const { error: messageError } = await supabase
      .from("support_ticket_messages")
      .insert({ ticket_id: ticket.id, sender_type: "user", sender_id: userId, message })
    if (messageError) throw messageError

    return ticket
  })
}

export function listMessages(userId, ticketId) {
  return orInternalError("fetch messages", async () => {
    const supabase = createDbClient()
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("id", ticketId)
      .eq("user_id", userId)
      .single()
    if (!ticket) throw portfolioError("Ticket not found or unauthorized", 404)

    const { data, error } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
    if (error) throw error
    return data
  })
}

/** Adds the artist's reply; a ticket awaiting the artist ("in_progress") goes back to "open". */
export function reply(userId, ticketId, message) {
  return orInternalError("send reply", async () => {
    if (!message) throw portfolioError("Message is required", 400)

    const supabase = createDbClient()
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("status")
      .eq("id", ticketId)
      .eq("user_id", userId)
      .single()
    if (!ticket) throw portfolioError("Ticket not found or unauthorized", 404)
    if (CLOSED_STATUSES.has(ticket.status)) throw portfolioError("Cannot reply to a closed ticket", 400)

    const { error } = await supabase
      .from("support_ticket_messages")
      .insert({ ticket_id: Number(ticketId), sender_type: "user", sender_id: userId, message })
    if (error) throw error

    if (ticket.status === "in_progress") {
      await supabase.from("support_tickets").update({ status: "open" }).eq("id", ticketId)
    }
    return null
  })
}
