import Razorpay from "razorpay"

let client: Razorpay | null = null

export function getRazorpayClient(): Razorpay {
  if (client) return client

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured")
  }

  client = new Razorpay({ key_id: keyId, key_secret: keySecret })
  return client
}

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  )
}
