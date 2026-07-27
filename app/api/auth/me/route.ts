import { NextResponse, type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ user: session })
}
