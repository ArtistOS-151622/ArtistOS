import assert from "node:assert/strict"
import test from "node:test"

import { scanDailyArtistAgenda } from "../lib/whatsapp/daily-artist-agenda.ts"

test("scanDailyArtistAgenda: formats line-by-line schedule with customer phone and sends to eligible Pro/Free artists", async () => {
  let loggedEvent: any = null
  const targetDate = "2026-10-25"

  const mockBookings = [
    {
      id: 501,
      user_id: 1,
      customer_id: 101,
      booking_date: targetDate,
      start_time: "10:00:00",
      end_time: "12:00:00",
      booking_address: "Bandra West, Mumbai",
      status: "confirmed",
      customer: { customer_name: "Sneha Patel", phone: "9876543210" },
      artist: {
        id: 1,
        artist_name: "Pooja Makeovers",
        studio_name: "Pooja Studio",
        phone: "9988776655",
        is_free_user: true,
      },
      booking_services: [
        { unit_price: 5000, quantity: 1, service: { service_name: "Bridal Makeup", price: 5000 } },
      ],
    },
    {
      id: 502,
      user_id: 1,
      customer_id: 102,
      booking_date: targetDate,
      start_time: "15:30:00",
      end_time: "17:00:00",
      booking_address: "Andheri East, Studio",
      status: "confirmed",
      customer: { customer_name: "Riya Shah", phone: "9123456780" },
      artist: {
        id: 1,
        artist_name: "Pooja Makeovers",
        studio_name: "Pooja Studio",
        phone: "9988776655",
        is_free_user: true,
      },
      booking_services: [
        { unit_price: 2000, quantity: 1, service: { service_name: "Hair Styling", price: 2000 } },
      ],
    },
  ]

  const mockSupabase: any = {
    from: (table: string) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: (_field1: string, _val1: any) => ({
              eq: (_field2: string, _val2: any) => ({
                order: () => Promise.resolve({ data: mockBookings, error: null }),
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
          in: () => queryBuilder,
          gte: () => queryBuilder,
          lte: () => queryBuilder,
          maybeSingle: async () => ({ data: null, error: null }),
          insert: async (data: any) => {
            loggedEvent = data
            return { data: { id: 1, ...data }, error: null }
          },
          update: async (data: any) => {
            loggedEvent = { ...loggedEvent, ...data }
            return { data: loggedEvent, error: null }
          },
        }
        return queryBuilder
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      }
    },
  }

  const result = await scanDailyArtistAgenda(mockSupabase, targetDate)

  assert.equal(result.scannedArtists, 1)
  // Without WHATSAPP_ACCESS_TOKEN in env, sendWhatsAppTemplate gracefully skips/fails
  // but validates the flow and records the event
  assert.equal(result.details.length, 1)
  assert.equal(result.details[0].artistId, 1)
  assert.equal(result.details[0].bookingsCount, 2)
  assert.ok(loggedEvent, "Expected audit event to be logged")
  assert.equal(loggedEvent.user_id, 1)
  assert.equal(loggedEvent.entity_type, "artist_daily_agenda")
  assert.ok(loggedEvent.body.includes("2 bookings"))
})

test("scanDailyArtistAgenda: skips artists on Starter plan without WhatsApp automation", async () => {
  const targetDate = "2026-10-25"
  const mockBookings = [
    {
      id: 503,
      user_id: 2,
      booking_date: targetDate,
      start_time: "11:00:00",
      status: "confirmed",
      customer: { customer_name: "Anita", phone: "9876543210" },
      artist: {
        id: 2,
        artist_name: "Anita Mehndi",
        phone: "9876543210",
        is_free_user: false,
      },
      booking_services: [],
    },
  ]

  const mockSupabase: any = {
    from: (table: string) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockBookings, error: null }),
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

  const result = await scanDailyArtistAgenda(mockSupabase, targetDate)
  assert.equal(result.scannedArtists, 1)
  assert.equal(result.skipped, 1)
  assert.equal(result.details[0].status, "skipped")
  assert.ok(result.details[0].reason?.includes("without WhatsApp automation"))
})

test("scanDailyArtistAgenda: returns 0 scanned when no bookings exist today", async () => {
  const mockSupabase: any = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  }

  const result = await scanDailyArtistAgenda(mockSupabase, "2026-10-25")
  assert.equal(result.scannedArtists, 0)
  assert.equal(result.sent, 0)
  assert.equal(result.skipped, 0)
})

test("scanDailyArtistAgenda: skips if already sent today (deduplication)", async () => {
  const targetDate = "2026-10-25"
  const mockBookings = [
    {
      id: 504,
      user_id: 3,
      booking_date: targetDate,
      start_time: "10:00:00",
      status: "confirmed",
      customer: { customer_name: "Customer A", phone: "9876543210" },
      artist: {
        id: 3,
        artist_name: "Pro Artist",
        phone: "9876543210",
        is_free_user: true,
      },
      booking_services: [],
    },
  ]

  const mockSupabase: any = {
    from: (table: string) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockBookings, error: null }),
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
          in: () => queryBuilder,
          gte: () => queryBuilder,
          lte: () => queryBuilder,
          maybeSingle: async () => ({
            data: { id: 99, status: "sent", attempts: 1 },
            error: null,
          }),
        }
        return queryBuilder
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      }
    },
  }

  const result = await scanDailyArtistAgenda(mockSupabase, targetDate)
  assert.equal(result.scannedArtists, 1)
  assert.equal(result.skipped, 1)
  assert.equal(result.details[0].status, "skipped")
  assert.equal(result.details[0].reason, "Daily agenda already sent today")
})
