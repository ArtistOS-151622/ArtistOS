import { type NextRequest, NextResponse } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const supabase = await createClient()
  const { id } = await params

  try {
    // Verify ownership
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()
      
    if (!ticket) return portfolioError("Ticket not found or unauthorized", 404)

    const { data: messages, error } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })

    if (error) throw error

    return portfolioSuccess("Messages loaded", messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return portfolioError("Internal server error", 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const supabase = await createClient()
  const { id } = await params

  try {
    const body = await request.json()
    const { message } = body

    if (!message) {
      return portfolioError("Message is required", 400)
    }

    // Verify ownership and check if not resolved/closed
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("status")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (!ticket) return portfolioError("Ticket not found or unauthorized", 404)
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      return portfolioError("Cannot reply to a closed ticket", 400)
    }

    const { error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: Number(id),
        sender_type: "user",
        sender_id: session.id,
        message
      })

    if (error) throw error

    // Update status back to open if it was in_progress (meaning user replied to admin)
    if (ticket.status === 'in_progress') {
       await supabase
        .from("support_tickets")
        .update({ status: 'open' })
        .eq("id", id)
    }

    return portfolioSuccess("Reply sent successfully", null, 201)
  } catch (error) {
    console.error("Error sending reply:", error)
    return portfolioError("Internal server error", 500)
  }
}
