import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type ServiceInput = {
  service_name?: string
  duration_minutes?: number
  price?: number
}

function validateId(value: string) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = validateId((await params).id)
  if (!id) return NextResponse.json({ error: "Invalid service id." }, { status: 400 })

  const body = (await request.json()) as ServiceInput
  const result = validateService(body)
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("services")
    .update(result.data)
    .eq("id", id)
    .eq("user_id", session.id)
    .select("id, service_name, duration_minutes, price, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ service: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = validateId((await params).id)
  if (!id) return NextResponse.json({ error: "Invalid service id." }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("user_id", session.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
