import { type NextRequest, NextResponse } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const supabase = await createClient()

  try {
    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", session.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return portfolioSuccess("Tickets loaded", tickets)
  } catch (error) {
    console.error("Error fetching tickets:", error)
    return portfolioError("Internal server error", 500)
  }
}

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const supabase = await createClient()

  try {
    const body = await request.json()
    const { subject, message, priority = "normal" } = body

    if (!subject || !message) {
      return portfolioError("Subject and message are required", 400)
    }

    // 1. Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: session.id,
        subject,
        priority
      })
      .select()
      .single()

    if (ticketError) throw ticketError

    // 2. Create the first message
    const { error: messageError } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_type: "user",
        sender_id: session.id,
        message
      })

    if (messageError) throw messageError

    return portfolioSuccess("Ticket created successfully", ticket, 201)
  } catch (error) {
    console.error("Error creating ticket:", error)
    return portfolioError("Internal server error", 500)
  }
}
