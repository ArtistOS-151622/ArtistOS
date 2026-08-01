import { NextResponse, type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const session = getArtistSession(req)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = await createClient()
    
    // Fetch user's templates and system templates (user_id IS NULL)
    const { data: templates, error } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .or(`user_id.eq.${session.id},user_id.is.null`)
      .order("id", { ascending: true })

    if (error) throw error

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error("Fetch templates error:", error)
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getArtistSession(req)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { title, content, image_url, language } = body

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("whatsapp_templates")
      .insert({
        user_id: session.id,
        title,
        content,
        language: language || 'English',
        image_url
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ template: data })
  } catch (error: any) {
    console.error("Create template error:", error)
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 })
  }
}
