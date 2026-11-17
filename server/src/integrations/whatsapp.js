import { config } from "#src/config/env.js"
import { logger } from "#src/utils/logger.js"

/** Meta WhatsApp Cloud API client: sends template messages. No app logic here. */

const GRAPH_API_BASE = "https://graph.facebook.com"
const SEND_TIMEOUT_MS = 15_000

const log = logger.child({ integration: "whatsapp" })

/**
 * Normalises a phone number to E.164 without '+', as the Cloud API expects.
 * 10-digit numbers are assumed Indian (+91).
 */
export function formatWhatsAppPhoneNumber(rawPhone) {
  if (!rawPhone) return null

  const digits = String(rawPhone).replace(/\D/g, "")

  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith("91")) return digits
  if (digits.length >= 10 && digits.length <= 15) return digits

  return null
}

/**
 * Makes a template parameter acceptable to Meta: no newlines or tabs, no more than
 * 4 consecutive spaces, never empty. `preserveNewlines` keeps line breaks.
 */
export function sanitizeWhatsAppParam(value, fallback = "-", options) {
  if (value === null || value === undefined) return fallback
  if (options?.preserveNewlines) {
    const cleaned = String(value)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ ]{4,}/g, "   ")
      .trim()
    return cleaned || fallback
  }
  const cleaned = String(value)
    .replace(/[\r\n\t]+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,+/g, ",")
    .trim()
  return cleaned || fallback
}

/**
 * Sends a template message. Never throws: resolves to
 * `{ success, messageId?, error?, details? }`.
 */
export async function sendWhatsAppTemplate({ to, templateName, languageCode, bodyParameters }) {
  const { accessToken, phoneNumberId, apiVersion, templateLang } = config.whatsapp

  if (!accessToken) {
    log.warn("WHATSAPP_ACCESS_TOKEN is not configured; message skipped")
    return { success: false, error: "WHATSAPP_ACCESS_TOKEN is not configured" }
  }

  const formattedPhone = formatWhatsAppPhoneNumber(to)
  if (!formattedPhone) {
    log.warn("invalid recipient phone number")
    return { success: false, error: "Invalid recipient phone number" }
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode || templateLang },
      components: [
        {
          type: "body",
          parameters: bodyParameters.map((param) => ({ type: "text", text: sanitizeWhatsAppParam(param) })),
        },
      ],
    },
  }

  try {
    const res = await fetch(`${GRAPH_API_BASE}/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      const error =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `HTTP ${res.status}: Failed to send WhatsApp message`
      log.error({ status: res.status, code: data?.error?.code, type: data?.error?.type }, "Meta API request failed")
      return { success: false, error, details: data }
    }

    log.info({ templateName }, "template sent")
    return { success: true, messageId: data?.messages?.[0]?.id, details: data }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
    const error = isTimeout
      ? `WhatsApp request timed out after ${SEND_TIMEOUT_MS / 1000} seconds`
      : err instanceof Error
        ? err.message
        : "Network error while connecting to Meta WhatsApp API"

    log.error({ error }, "send error")
    return { success: false, error }
  }
}
