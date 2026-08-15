import { randomBytes } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

const FORM_CODE_BYTES = 5
export const INQUIRY_FORM_ACTIVE_HOURS = 10

function createInquiryFormCode() {
  return randomBytes(FORM_CODE_BYTES).toString("hex").toUpperCase()
}

export async function ensureInquiryFormLink(supabase: SupabaseClient, userId: number) {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, inquiry_form_code, inquiry_form_active_until")
    .eq("id", userId)
    .single()

  if (error) return { error: error.message }
  if (user.inquiry_form_code) {
    return {
      code: user.inquiry_form_code as string,
      active_until: user.inquiry_form_active_until as string | null,
    }
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createInquiryFormCode()
    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({ inquiry_form_code: code })
      .eq("id", userId)
      .select("inquiry_form_code, inquiry_form_active_until")
      .single()

    if (!updateError) {
      return {
        code: updated.inquiry_form_code as string,
        active_until: updated.inquiry_form_active_until as string | null,
      }
    }

    if (updateError.code !== "23505") return { error: updateError.message }
  }

  return { error: "Unable to create inquiry form code." }
}

export async function activateInquiryFormLink(supabase: SupabaseClient, userId: number) {
  const ensured = await ensureInquiryFormLink(supabase, userId)
  if ("error" in ensured) return ensured

  const activeUntil = new Date(Date.now() + INQUIRY_FORM_ACTIVE_HOURS * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("users")
    .update({ inquiry_form_active_until: activeUntil })
    .eq("id", userId)
    .select("inquiry_form_code, inquiry_form_active_until")
    .single()

  if (error) return { error: error.message }

  return {
    code: data.inquiry_form_code as string,
    active_until: data.inquiry_form_active_until as string,
  }
}

export function isInquiryFormActive(activeUntil?: string | null) {
  return Boolean(activeUntil && new Date(activeUntil).getTime() > Date.now())
}
