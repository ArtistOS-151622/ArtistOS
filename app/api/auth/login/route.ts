import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createHash } from "crypto"
import { createArtistToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, password } = body

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone number and password are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Query for user in 'users' table
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .maybeSingle()

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "Database table 'users' not found. Please run the SQL schema in your Supabase SQL editor." },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "No account found with this phone number." },
        { status: 400 }
      )
    }

    // Verify hashed password
    const inputHash = createHash("sha256").update(password).digest("hex")
    if (inputHash !== data.password) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 400 }
      )
    }

    // Create session object
    const sessionData = {
      id: data.id,
      phone: data.phone,
      artist_name: data.artist_name,
      studio_name: data.studio_name,
    }

    const token = createArtistToken(sessionData)
    const response = NextResponse.json({ success: true, user: sessionData, token })

    response.cookies.set("artist_session", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
    })

    return response
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "An unexpected error occurred during login." },
      { status: 500 }
    )
  }
}
