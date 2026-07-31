import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getArtistSession } from "@/lib/auth/session"
import { wakeWhatsAppWorker } from "@/lib/whatsapp/worker"

const VALID_DEVICE_STATUSES = new Set([
  "DISCONNECTED",
  "REQUESTING_PAIRING_CODE",
  "PAIRING_CODE_READY",
  "CONNECTED",
])

function normalizePhoneNumber(value: unknown) {
  if (typeof value !== "string") return null
  const cleaned = value.replace(/\D/g, "")
  return cleaned.length >= 10 && cleaned.length <= 15 ? cleaned : null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Internal Error"
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = getArtistSession(req)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("whatsapp_devices")
      .delete()
      .eq("id", id)
      .eq("user_id", session.id)

    if (error) {
      console.error("Error deleting device:", error)
      return NextResponse.json({ error: "Failed to delete device" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = getArtistSession(req)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const supabase = await createClient()
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.name === "string" && body.name.trim()) {
      update.name = body.name.trim()
    }

    if ("session_status" in body) {
      if (!VALID_DEVICE_STATUSES.has(body.session_status)) {
        return NextResponse.json({ error: "Invalid device status" }, { status: 400 })
      }

      update.session_status = body.session_status

      if (body.session_status === "REQUESTING_PAIRING_CODE") {
        const phoneNumber = normalizePhoneNumber(body.session_data?.phoneNumber)
        if (!phoneNumber) {
          return NextResponse.json(
            { error: "Valid WhatsApp phone number with country code is required" },
            { status: 400 },
          )
        }

        update.session_data = {
          phoneNumber,
          requestedAt: new Date().toISOString(),
          pairingCode: null,
          pairingCodeGeneratedAt: null,
          lastError: null,
        }
      } else if (body.session_status === "DISCONNECTED") {
        update.session_data = null
      }
    }

    const { error } = await supabase
      .from("whatsapp_devices")
      .update(update)
      .eq("id", id)
      .eq("user_id", session.id)

    if (error) {
      console.error("Error updating device:", error)
      return NextResponse.json({ error: "Failed to update device" }, { status: 500 })
    }

    if (update.session_status === "REQUESTING_PAIRING_CODE") {
      void wakeWhatsAppWorker()
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}
