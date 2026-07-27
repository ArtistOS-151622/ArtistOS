import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: messages, error } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })

    if (error) throw error

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const body = await req.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: Number(id),
        sender_type: "admin",
        message
      })

    if (error) throw error

    // Also update ticket status to in_progress if it was open
    await supabase
      .from("support_tickets")
      .update({ status: "in_progress" })
      .eq("id", id)
      .eq("status", "open")

    return NextResponse.json({ status: true, message: "Reply sent" })
  } catch (error) {
    console.error("Error sending reply:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
