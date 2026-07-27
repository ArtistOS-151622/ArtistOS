import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const body = await req.json()
    const { status } = body

    const { error } = await supabase
      .from("support_tickets")
      .update({ status })
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ status: true, message: "Ticket updated" })
  } catch (error) {
    console.error("Error updating ticket:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
