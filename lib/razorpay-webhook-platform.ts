export type RazorpayNotes = Record<string, unknown>

export type RazorpayWebhookEntity = {
  id?: string
  notes?: RazorpayNotes
  method?: string
  subscription_id?: string
  current_start?: number
  current_end?: number
  charge_at?: number
  end_at?: number
}

// Razorpay does not put an event id in the webhook body -- it is sent as the
// x-razorpay-event-id request header. See app/api/webhooks/razorpay/route.ts.
export type RazorpayWebhookPayload = {
  event?: string
  payload?: {
    payment?: { entity?: RazorpayWebhookEntity }
    subscription?: { entity?: RazorpayWebhookEntity }
  }
}

export function getRazorpayWebhookNotes(payload: RazorpayWebhookPayload): RazorpayNotes {
  const paymentNotes = payload.payload?.payment?.entity?.notes ?? {}
  const subscriptionNotes = payload.payload?.subscription?.entity?.notes ?? {}

  return {
    ...subscriptionNotes,
    ...paymentNotes,
  }
}

export function getRazorpayWebhookSubscriptionId(payload: RazorpayWebhookPayload): string | undefined {
  return (
    payload.payload?.subscription?.entity?.id ??
    payload.payload?.payment?.entity?.subscription_id
  )
}
