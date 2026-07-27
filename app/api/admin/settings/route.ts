import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Get all settings
export async function GET() {
  const supabase = await createClient()

  try {
    const { data: settings, error } = await supabase
      .from("platform_settings")
      .select("*")
      .order("id", { ascending: true })

    if (error) throw error

    // Convert array of settings into a key-value object
    const settingsMap = settings.reduce((acc: Record<string, any>, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {})

    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error("Error fetching platform settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Update settings
export async function POST(req: Request) {
  const supabase = await createClient()

  try {
    const body = await req.json()
    // body should be an object of key-value pairs to update
    
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        const { error } = await supabase
          .from("platform_settings")
          .update({ value })
          .eq("key", key)
          
        if (error) {
          console.error(`Failed to update setting ${key}:`, error)
        }
      }
    }

    return NextResponse.json({ status: true, message: "Settings updated successfully" })
  } catch (error) {
    console.error("Error updating platform settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
