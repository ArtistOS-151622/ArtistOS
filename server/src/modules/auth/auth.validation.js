import { z } from "zod"

/** Last 10 digits of whatever the user typed. */
const tenDigitPhone = (message) =>
  z
    .unknown()
    .optional()
    .transform((value) => String(value ?? "").trim().replace(/\D/g, "").slice(-10))
    .refine((phone) => phone.length === 10, { message })

// zod 4: a key whose schema transforms must be marked .optional() before the
// transform, or a missing key fails with "expected nonoptional".
const optionalString = z
  .unknown()
  .optional()
  .transform((value) => (typeof value === "string" ? value : undefined))

export const sendOtpSchema = {
  body: z.object({ phone: tenDigitPhone("Please enter a valid 10-digit mobile number.") }),
}

export const verifyOtpSchema = {
  body: z.object({
    phone: tenDigitPhone("Please provide a valid 10-digit mobile number."),
    otp: z
      .unknown()
      .optional()
      .transform((value) => String(value ?? "").trim())
      .refine((otp) => /^\d{6}$/.test(otp), { message: "Please enter the complete 6-digit OTP received on WhatsApp." }),
    stateToken: optionalString,
  }),
}

// Presence/order checks stay in the service so the 401 (token) comes before the 400 (fields).
export const registerProfileSchema = {
  body: z.object({
    registrationToken: optionalString,
    artistName: optionalString,
    studioName: optionalString,
    address: optionalString,
    email: optionalString,
    studioLogo: optionalString,
  }),
}
