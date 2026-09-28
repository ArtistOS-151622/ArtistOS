import { randomBytes } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

const FORM_CODE_BYTES = 5

function createInquiryFormCode() {
  return randomBytes(FORM_CODE_BYTES).toString("hex").toUpperCase()
}

export async function ensureInquiryFormLink(supabase: SupabaseClient, userId: number) {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, inquiry_form_code")
    .eq("id", userId)
    .single()

  if (error) return { error: error.message }
  if (user.inquiry_form_code) {
    return {
      code: user.inquiry_form_code as string,
      is_active: true,
    }
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createInquiryFormCode()
    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({ inquiry_form_code: code })
      .eq("id", userId)
      .select("inquiry_form_code")
      .single()

    if (!updateError) {
      return {
        code: updated.inquiry_form_code as string,
        is_active: true,
      }
    }

    if (updateError.code !== "23505") return { error: updateError.message }
  }

  return { error: "Unable to create inquiry form code." }
}

export async function activateInquiryFormLink(supabase: SupabaseClient, userId: number) {
  const ensured = await ensureInquiryFormLink(supabase, userId)
  if ("error" in ensured) return ensured

  return {
    code: ensured.code,
    is_active: true,
  }
}

export function isInquiryFormActive(_activeUntil?: string | null) {
  return true
}
