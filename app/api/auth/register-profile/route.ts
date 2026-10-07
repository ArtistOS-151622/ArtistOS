import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createHash, randomBytes } from "crypto"
import { verifyRegistrationToken } from "@/lib/auth/otp"
import { STORAGE_FREE_TIER_BYTES } from "@/lib/portfolio/config"
import { createArtistToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { registrationToken, artistName, studioName, address, email, studioLogo } = body

    if (!registrationToken) {
      return NextResponse.json(
        { error: "Verification token missing. Please verify your mobile number with OTP first." },
        { status: 401 }
      )
    }

    const tokenData = verifyRegistrationToken(registrationToken)
    if (!tokenData) {
      return NextResponse.json(
        { error: "Verification session has expired. Please verify your mobile number again." },
        { status: 401 }
      )
    }

    const { phone } = tokenData

    if (!artistName?.trim() || !studioName?.trim() || !address?.trim()) {
      return NextResponse.json(
        { error: "Artist name, studio name, and address are required." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if account already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle()

    let userData: any

    if (existingUser) {
      // Update profile
      const { data: updated, error: updateError } = await supabase
        .from("users")
        .update({
          artist_name: artistName.trim(),
          studio_name: studioName.trim(),
          address: address.trim(),
          email: email?.trim() || null,
        })
        .eq("id", existingUser.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }
      userData = updated
    } else {
      // Generate secure random SHA-256 hash to satisfy varchar(64) not null DB constraints
      const randomSecret = randomBytes(32).toString("hex")
      const passwordHash = createHash("sha256").update(randomSecret).digest("hex")

      const { data: created, error: insertError } = await supabase
        .from("users")
        .insert({
          phone,
          password: passwordHash,
          artist_name: artistName.trim(),
          studio_name: studioName.trim(),
          address: address.trim(),
          email: email?.trim() || null,
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }
      userData = created
    }

    // Initialize storage quota if not present
    await supabase
      .from("portfolio_storage_quotas")
      .upsert({
        user_id: userData.id,
        free_storage_bytes: STORAGE_FREE_TIER_BYTES,
      })
      .select()

    // Create default "My Portfolio" folder if not present
    const { data: existingFolder } = await supabase
      .from("portfolio_folders")
      .select("id")
      .eq("user_id", userData.id)
      .maybeSingle()

    let defaultFolder = existingFolder
    if (!defaultFolder) {
      const { data: newFolder } = await supabase
        .from("portfolio_folders")
        .insert({
          user_id: userData.id,
          name: "My Portfolio",
          created_by: userData.id,
        })
        .select()
        .single()
      defaultFolder = newFolder
    }

    // Upload studio logo if provided
    if (studioLogo && defaultFolder) {
      const match = studioLogo.match(/^data:([a-zA-Z0-9-+\/]+);base64,(.+)$/)
      if (match) {
        const mimeType = match[1]
        const buffer = Buffer.from(match[2], "base64")
        const extension = mimeType.split("/")[1] || "jpeg"
        const filename = `studio-logo.${extension}`
        const fileSize = buffer.length

        try {
          const { prepareUploadKey, overwriteFileInR2, confirmFileUpload } = await import("@/lib/portfolio/files")
          const { key, extension: ext } = prepareUploadKey(userData.id, defaultFolder.id, filename)

          await overwriteFileInR2(key, buffer, mimeType)

          const uploaded = await confirmFileUpload(supabase, {
            userId: userData.id,
            folderId: defaultFolder.id,
            storagePath: key,
            originalName: filename,
            mimeType,
            extension: ext,
            fileSize,
          })

          await supabase
            .from("users")
            .update({ studio_logo_file_id: uploaded.id })
            .eq("id", userData.id)
        } catch (err) {
          console.error("[Register Profile] Failed to upload studio logo:", err)
        }
      }
    }

    // Create 1-year artist session
    const sessionData = {
      id: userData.id,
      phone: userData.phone,
      artist_name: userData.artist_name,
      studio_name: userData.studio_name,
    }

    const token = createArtistToken(sessionData)
    const response = NextResponse.json({
      success: true,
      user: sessionData,
      token,
      redirectUrl: "/dashboard",
    })

    response.cookies.set("artist_session", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS, // 1 year
    })

    return response
  } catch (err: any) {
    console.error("[Register Profile] Unexpected error:", err)
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred while saving your studio profile." },
      { status: 500 }
    )
  }
}
