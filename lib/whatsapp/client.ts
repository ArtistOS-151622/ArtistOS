/**
 * Meta WhatsApp Cloud API Client
 * Official Graph API integration for sending WhatsApp template messages
 */

export type SendWhatsAppTemplateOptions = {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters: string[];
};

export type WhatsAppSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: unknown;
};

/**
 * Normalizes any phone number into E.164 format without '+' for WhatsApp Cloud API.
 * Defaults to country code 91 (India) for 10-digit numbers.
 */
export function formatWhatsAppPhoneNumber(rawPhone: string): string | null {
  if (!rawPhone) return null;

  // Remove all non-numeric characters
  const digits = rawPhone.replace(/\D/g, "");

  // If 10 digits (Standard Indian mobile without country code)
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // If 11 digits starting with 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }

  // If 12 digits starting with 91 (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  // Other international formats between 10 and 15 digits
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}

/**
 * Sends a WhatsApp template message using Meta's Cloud API
 */
export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode,
  bodyParameters,
}: SendWhatsAppTemplateOptions): Promise<WhatsAppSendResult> {
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "1301710916364476";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v20.0";
  const lang =
    languageCode || process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en";

  if (!accessToken) {
    console.warn(
      "[WhatsApp] WHATSAPP_ACCESS_TOKEN is not configured in environment variables. Message skipped.",
    );
    return {
      success: false,
      error: "WHATSAPP_ACCESS_TOKEN is not configured",
    };
  }

  const formattedPhone = formatWhatsAppPhoneNumber(to);
  if (!formattedPhone) {
    console.warn(`[WhatsApp] Invalid phone number provided: ${to}`);
    return {
      success: false,
      error: `Invalid recipient phone number: ${to}`,
    };
  }

  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: lang,
      },
      components: [
        {
          type: "body",
          parameters: bodyParameters.map((param) => ({
            type: "text",
            text: String(param ?? ""),
          })),
        },
      ],
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `HTTP ${res.status}: Failed to send WhatsApp message`;
      console.error("[WhatsApp] Meta API error:", data?.error || data);
      return {
        success: false,
        error: errorMsg,
        details: data,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log(
      `[WhatsApp] Message successfully sent to ${formattedPhone} (Template: ${templateName}, ID: ${messageId})`,
    );

    return {
      success: true,
      messageId,
      details: data,
    };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    const errorMsg = isAbort
      ? "WhatsApp request timed out after 8 seconds"
      : err?.message || "Network error while connecting to Meta WhatsApp API";

    console.error("[WhatsApp] Send error:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  } finally {
    clearTimeout(timeout);
  }
}
