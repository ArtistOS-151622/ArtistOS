import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type ServiceInput = {
  service_name?: string
  duration_minutes?: number
  price?: number
}

function validateService(input: ServiceInput) {
  const service_name = input.service_name?.trim()
  const duration_minutes = Number(input.duration_minutes)
  const price = Number(input.price)

  if (!service_name) return { error: "Service name is required." }
  if (!Number.isInteger(duration_minutes) || duration_minutes <= 0) {
    return { error: "Duration must be a valid number of minutes." }
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be a valid amount." }
  }

  return { data: { service_name, duration_minutes, price } }
}

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() || ""

  const supabase = await createClient()
  let query = supabase
    .from("services")
    .select("id, service_name, duration_minutes, price, created_at")
    .eq("user_id", session.id)

  if (search) {
    query = query.ilike("service_name", `%${search}%`)
  }

  const { data, error } = await query.order("id", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ services: data ?? [] })
}

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json()) as ServiceInput
  const result = validateService(body)
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("services")
    .insert({ ...result.data, user_id: session.id })
    .select("id, service_name, duration_minutes, price, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ service: data })
}
