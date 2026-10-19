import assert from "node:assert/strict"
import test from "node:test"
import { sendInquiryNotificationWhatsApp } from "../lib/whatsapp/inquiry-notifications.ts"

test("sendInquiryNotificationWhatsApp: skips sending when artist lacks WhatsApp automation feature", async () => {
  const mockSupabase: any = {
    from: (table: string) => {
      if (table === "inquiries") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 101,
                  user_id: 1,
                  customer_id: 5,
                  booking_address: "123 Marine Drive, Mumbai",
                  booking_date: "2026-10-25",
                  start_time: "10:00",
                  end_time: "12:00",
                  status: "new",
                  customer: { customer_name: "Rani Patel", phone: "9876543210", address: "123 Marine Drive, Mumbai" },
                  artist: { artist_name: "Sneha Arts", studio_name: "Sneha Studio", phone: "9123456780" },
                  inquiry_services: [
                    { service: { service_name: "Bridal Mehandi", price: 5000 } },
                  ],
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { created_at: "2026-01-01T00:00:00Z", is_free_user: false },
                error: null,
              }),
              single: async () => ({
                data: { created_at: "2026-01-01T00:00:00Z", is_free_user: false },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === "user_subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: {
                        status: "active",
                        next_billing_at: "2026-12-31T00:00:00Z",
                        platform_subscriptions: {
                          name: "Starter Plan",
                          has_whatsapp_automation: false,
                        },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      }
    },
  }

  const result = await sendInquiryNotificationWhatsApp(101, mockSupabase)
  assert.equal(result.success, false)
  assert.equal(result.skipped, true)
})

test("sendInquiryNotificationWhatsApp: formats parameters and sends to artist when WhatsApp automation is active", async () => {
  let loggedEvent: any = null

  const mockSupabase: any = {
    from: (table: string) => {
      if (table === "inquiries") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 102,
                  user_id: 2,
                  customer_id: 6,
                  booking_address: "Plot 42, Bandra West, Mumbai",
                  booking_date: "2026-11-15",
                  start_time: "14:00",
                  end_time: "16:00",
                  status: "new",
                  customer: {
                    customer_name: "Pooja Sharma",
                    phone: "9876543210",
                    address: "Plot 42, Bandra West, Mumbai",
                  },
                  artist: {
                    artist_name: "Pooja Makeovers",
                    studio_name: "Pooja Studio",
                    phone: "9988776655",
                  },
                  inquiry_services: [
                    { service: { service_name: "Bridal Makeup", price: 15000 } },
                    { service: { service_name: "Hair Styling", price: 3000 } },
                  ],
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                // Free user has WhatsApp automation active
                data: { created_at: "2026-01-01T00:00:00Z", is_free_user: true },
                error: null,
              }),
              single: async () => ({
                data: { created_at: "2026-01-01T00:00:00Z", is_free_user: true },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === "notification_events") {
        const queryBuilder: any = {
          select: () => queryBuilder,
          eq: () => queryBuilder,
          maybeSingle: async () => ({ data: null, error: null }),
          insert: async (data: any) => {
            loggedEvent = data
            return { data: { id: 1, ...data }, error: null }
          },
        }
        return queryBuilder
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      }
    },
  }

  // Without WHATSAPP_ACCESS_TOKEN in env, sendWhatsAppTemplate gracefully skips with success: false
  // but validates and logs to notification_events
  const result = await sendInquiryNotificationWhatsApp(102, mockSupabase)
  assert.equal(result.skipped, undefined)
  
  // Verify notification event audit log
  assert.ok(loggedEvent, "Expected notification event to be logged")
  assert.equal(loggedEvent.user_id, 2)
  assert.equal(loggedEvent.channel, "whatsapp")
  assert.equal(loggedEvent.event_type, "new_inquiry_received")
  assert.equal(loggedEvent.entity_type, "inquiry")
  assert.equal(loggedEvent.entity_id, 102)
  assert.equal(loggedEvent.url, "/inquiries")
  assert.ok(loggedEvent.body.includes("Pooja Sharma"))
  assert.ok(loggedEvent.body.includes("Bridal Makeup, Hair Styling"))
})

test("sendInquiryNotificationWhatsApp: returns error when inquiry does not exist", async () => {
  const mockSupabase: any = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  }

  const result = await sendInquiryNotificationWhatsApp(9999, mockSupabase)
  assert.equal(result.success, false)
  assert.equal(result.error, "Inquiry not found")
})

test("sendInquiryNotificationWhatsApp: sanitizes multiline address and newlines for Meta WhatsApp compliance", async () => {
  let loggedEvent: any = null

  const mockSupabase: any = {
    from: (table: string) => {
      if (table === "inquiries") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 103,
                  user_id: 3,
                  customer_id: 7,
                  booking_address: "Xyz\nXyx\nLine 3",
                  booking_date: "2026-10-22",
                  status: "new",
                  customer: {
                    customer_name: "Priyank Viradiya",
                    phone: "9313202075",
                    address: "Xyz\nXyx",
                  },
                  artist: {
                    artist_name: "ArtistOS CRM",
                    phone: "8320620125",
                  },
                  inquiry_services: [
                    { service: { service_name: "mahendi service", price: 1000 } },
                  ],
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { created_at: "2026-01-01T00:00:00Z", is_free_user: true },
                error: null,
              }),
              single: async () => ({
                data: { created_at: "2026-01-01T00:00:00Z", is_free_user: true },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === "notification_events") {
        const queryBuilder: any = {
          select: () => queryBuilder,
          eq: () => queryBuilder,
          maybeSingle: async () => ({ data: null, error: null }),
          insert: async (data: any) => {
            loggedEvent = data
            return { data: { id: 1, ...data }, error: null }
          },
        }
        return queryBuilder
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      }
    },
  }

  const result = await sendInquiryNotificationWhatsApp(103, mockSupabase)
  assert.equal(result.skipped, undefined)
  assert.ok(loggedEvent)
  // Ensure no newlines exist in the logged text
  assert.equal(loggedEvent.body.includes("\n"), false)
})
