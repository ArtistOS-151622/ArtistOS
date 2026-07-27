import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("*, users(artist_name, studio_name, email, phone)")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(tickets)
  } catch (error) {
    console.error("Error fetching tickets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
