import { NextResponse, type NextRequest } from "next/server"
import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getArtistSession(req)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const p = await params
    const templateId = Number(p.id)
    if (!templateId) return NextResponse.json({ error: "Invalid template ID" }, { status: 400 })

    const supabase = await createClient()

    if (await checkIsReadOnly(supabase, session.id)) {
      return NextResponse.json({ error: "Your subscription has expired. Please upgrade to delete templates." }, { status: 403 })
    }

    // Can only delete templates that belong to the user
    const { error } = await supabase
      .from("whatsapp_templates")
      .delete()
      .eq("id", templateId)
      .eq("user_id", session.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Delete template error:", error)
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
  }
}
