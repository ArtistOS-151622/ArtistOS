import { type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { findOrCreateBookingFolder } from "@/lib/portfolio/folders"
import { listFilesInFolder } from "@/lib/portfolio/files"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return portfolioError("Invalid booking ID", 400)

  const supabase = await createClient()

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("user_id", session.id)
    .maybeSingle()

  if (bookingError || !booking) return portfolioError("Booking not found", 404)

  try {
    const folder = await findOrCreateBookingFolder(supabase, session.id, bookingId)
    const allFiles = await listFilesInFolder(supabase, session.id, folder.id)

    return portfolioSuccess("Booking portfolio loaded", {
      folder,
      reference_files: allFiles.filter((f) => f.section === "reference"),
      delivery_files: allFiles.filter((f) => f.section === "delivery"),
      files: allFiles,
    })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Failed to load portfolio", 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const bookingId = Number((await params).id)
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("user_id", session.id)
    .maybeSingle()

  if (!booking) return portfolioError("Booking not found", 404)

  try {
    const folder = await findOrCreateBookingFolder(supabase, session.id, bookingId)
    return portfolioSuccess("Booking folder ready", { folder }, 201)
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Failed to create folder", 500)
  }
}
