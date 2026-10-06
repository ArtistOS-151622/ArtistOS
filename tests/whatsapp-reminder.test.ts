import assert from "node:assert/strict"
import test from "node:test"

import {
  getMinutesUntilBooking,
  toWallClock,
  APP_TIMEZONE,
} from "../lib/notifications/time.ts"
import { scanCustomerWhatsAppReminders } from "../lib/whatsapp/booking-notifications.ts"

test("getMinutesUntilBooking computes 24-hour differences correctly", () => {
  // Exactly 24 hours before
  const diff24h = getMinutesUntilBooking("2026-10-06", "15:30:00", "2026-10-05", "15:30")
  assert.equal(diff24h, 1440)

  // 18 hours before
  const diff18h = getMinutesUntilBooking("2026-10-06", "09:30:00", "2026-10-05", "15:30")
  assert.equal(diff18h, 1080)

  // 26 hours before (too early)
  const diff26h = getMinutesUntilBooking("2026-10-06", "17:30:00", "2026-10-05", "15:30")
  assert.equal(diff26h, 1560)

  // Already started
  const diff0 = getMinutesUntilBooking("2026-10-05", "15:30:00", "2026-10-05", "15:30")
  assert.equal(diff0, 0)
})

test("scanCustomerWhatsAppReminders filters and sends 24h reminders using mock client", async () => {
  const now = new Date()

  // Helper to add minutes relative to now in artist's timezone
  const addMinutes = (mins: number) => {
    const target = new Date(now.getTime() + mins * 60_000)
    const wall = toWallClock(target, APP_TIMEZONE)
    return { date: wall.date, time: `${wall.time}:00` }
  }

  // 1. Tomorrow in 23 hours (eligible for 24h reminder)
  const bTomorrow23h = addMinutes(23 * 60)
  // 2. Tomorrow in 30 hours (too far away, > 24h)
  const bTomorrow30h = addMinutes(30 * 60)
  // 3. Already sent booking
  const bAlreadySent = addMinutes(20 * 60)

  const mockBookings = [
    {
      id: 201,
      user_id: 1,
      customer_id: 10,
      booking_date: bTomorrow23h.date,
      start_time: bTomorrow23h.time,
      status: "confirmed",
      discount: 0,
      customer: { customer_name: "Alice", phone: "9876543210" },
      artist: { artist_name: "Maya Art", studio_name: "Maya Studio" },
      booking_services: [{ unit_price: 1200, quantity: 1, service: { service_name: "Bridal Mehandi", price: 1200 } }],
      booking_additional_charges: [],
    },
    {
      id: 202,
      user_id: 1,
      customer_id: 11,
      booking_date: bTomorrow30h.date,
      start_time: bTomorrow30h.time,
      status: "confirmed",
      discount: 0,
      customer: { customer_name: "Bob", phone: "9876543211" },
      artist: { artist_name: "Maya Art", studio_name: "Maya Studio" },
      booking_services: [],
      booking_additional_charges: [],
    },
    {
      id: 203,
      user_id: 1,
      customer_id: 12,
      booking_date: bAlreadySent.date,
      start_time: bAlreadySent.time,
      status: "confirmed",
      discount: 0,
      customer: { customer_name: "Charlie", phone: "9876543212" },
      artist: { artist_name: "Maya Art", studio_name: "Maya Studio" },
      booking_services: [],
      booking_additional_charges: [],
    },
  ]

  const sentLogs: Array<Record<string, unknown>> = []

  const mockSupabase = {
    from: (table: string) => {
      if (table === "bookings") {
        return {
          select: () => ({
            in: () => ({
              gte: () => ({
                lte: async () => ({ data: mockBookings, error: null }),
              }),
            }),
            eq: (col: string, val: unknown) => ({
              maybeSingle: async () => {
                const b = mockBookings.find((item) => item.id === Number(val))
                return { data: b || null, error: null }
              },
            }),
          }),
        }
      }
      if (table === "notification_events") {
        return {
          select: () => ({
            eq: (_c1: string, _v1: unknown) => ({
              eq: (_c2: string, _v2: unknown) => ({
                eq: (_c3: string, _v3: unknown) => ({
                  eq: (_c4: string, _v4: unknown) => ({
                    eq: (_c5: string, val: unknown) => ({
                      maybeSingle: async () => {
                        // Return already sent status for booking 203
                        if (Number(val) === 203) {
                          return { data: { id: 999, status: "sent", attempts: 1 }, error: null }
                        }
                        return { data: null, error: null }
                      },
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: async (row: Record<string, unknown>) => {
            sentLogs.push(row)
            return { error: null }
          },
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      }
      return {}
    },
  } as unknown as Parameters<typeof scanCustomerWhatsAppReminders>[0]

  const result = await scanCustomerWhatsAppReminders(mockSupabase)

  assert.equal(result.scanned, 3)
  // Booking 201 should be processed (will attempt send)
  // Booking 202 is >24h away -> skipped
  // Booking 203 was already sent -> skipped
  assert.ok(result.skipped >= 2)
  const detail202 = result.details?.find((d) => d.bookingId === 202)
  assert.equal(detail202?.status, "skipped")
  assert.ok(detail202?.reason?.includes("More than 24h away"))

  const detail203 = result.details?.find((d) => d.bookingId === 203)
  assert.equal(detail203?.status, "skipped")
  assert.equal(detail203?.reason, "Reminder already sent")
})
