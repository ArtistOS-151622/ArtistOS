import { randomBytes } from "node:crypto"

const FORM_CODE_BYTES = 5
const MAX_CODE_ATTEMPTS = 5
const UNIQUE_VIOLATION = "23505"

const createInquiryFormCode = () => randomBytes(FORM_CODE_BYTES).toString("hex").toUpperCase()

/** The artist's public inquiry form code, created on first use. → { code, is_active } or { error } */
export async function ensureInquiryFormLink(supabase, userId) {
  const { data: user, error } = await supabase.from("users").select("id, inquiry_form_code").eq("id", userId).single()

  if (error) return { error: error.message }
  if (user.inquiry_form_code) return { code: user.inquiry_form_code, is_active: true }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({ inquiry_form_code: createInquiryFormCode() })
      .eq("id", userId)
      .select("inquiry_form_code")
      .single()

    if (!updateError) return { code: updated.inquiry_form_code, is_active: true }
    if (updateError.code !== UNIQUE_VIOLATION) return { error: updateError.message }
  }

  return { error: "Unable to create inquiry form code." }
}
