import assert from "node:assert/strict"
import test from "node:test"

import {
  BOOKING_REMINDER_10M_EVENT_TYPE,
  BOOKING_REMINDER_2H_EVENT_TYPE,
  getMinutesUntilBooking,
} from "../lib/notifications/producers/bookings.ts"

test("getMinutesUntilBooking calculates exact minute difference", () => {
  // Same day 2 hours before
  const diff2h = getMinutesUntilBooking("2026-09-29", "17:30:00", "2026-09-29", "15:30")
  assert.equal(diff2h, 120)

  // Same day 10 minutes before
  const diff10m = getMinutesUntilBooking("2026-09-29", "15:40:00", "2026-09-29", "15:30")
  assert.equal(diff10m, 10)

  // Same day 5 minutes before
  const diff5m = getMinutesUntilBooking("2026-09-29", "15:35:00", "2026-09-29", "15:30")
  assert.equal(diff5m, 5)

  // Booking in the past
  const diffPast = getMinutesUntilBooking("2026-09-29", "15:00:00", "2026-09-29", "15:30")
  assert.equal(diffPast, -30)

  // Midnight crossing (next day early morning)
  const diffMidnight = getMinutesUntilBooking("2026-09-30", "01:00:00", "2026-09-29", "23:30")
  assert.equal(diffMidnight, 90)
})

test("Reminder event type logic classifies 2h and 10m windows correctly", () => {
  function classifyReminder(diffMinutes: number): { eligible: boolean; type?: string } {
    if (diffMinutes <= 0) return { eligible: false }
    if (diffMinutes > 120) return { eligible: false }
    if (diffMinutes <= 10) {
      return { eligible: true, type: BOOKING_REMINDER_10M_EVENT_TYPE }
    }
    return { eligible: true, type: BOOKING_REMINDER_2H_EVENT_TYPE }
  }

  // More than 2 hours: not eligible yet
  assert.deepEqual(classifyReminder(150), { eligible: false })
  assert.deepEqual(classifyReminder(121), { eligible: false })

  // 2 hours window (120 min down to 11 min): 2h reminder
  assert.deepEqual(classifyReminder(120), { eligible: true, type: BOOKING_REMINDER_2H_EVENT_TYPE })
  assert.deepEqual(classifyReminder(60), { eligible: true, type: BOOKING_REMINDER_2H_EVENT_TYPE })
  assert.deepEqual(classifyReminder(15), { eligible: true, type: BOOKING_REMINDER_2H_EVENT_TYPE })
  assert.deepEqual(classifyReminder(11), { eligible: true, type: BOOKING_REMINDER_2H_EVENT_TYPE })

  // 10 minutes window (10 min down to 1 min): 10m reminder
  assert.deepEqual(classifyReminder(10), { eligible: true, type: BOOKING_REMINDER_10M_EVENT_TYPE })
  assert.deepEqual(classifyReminder(5), { eligible: true, type: BOOKING_REMINDER_10M_EVENT_TYPE })
  assert.deepEqual(classifyReminder(1), { eligible: true, type: BOOKING_REMINDER_10M_EVENT_TYPE })

  // Booking already started or passed
  assert.deepEqual(classifyReminder(0), { eligible: false })
  assert.deepEqual(classifyReminder(-10), { eligible: false })
})

test("scanBookingReminders enqueues 2h and 10m reminders using mock client", async () => {
  const { scanBookingReminders } = await import("../lib/notifications/producers/bookings.ts")
  const { toWallClock, APP_TIMEZONE } = await import("../lib/notifications/time.ts")

  const now = new Date()

  // Create start times relative to now
  const addMinutes = (mins: number) => {
    const target = new Date(now.getTime() + mins * 60_000)
    const wall = toWallClock(target, APP_TIMEZONE)
    return { date: wall.date, time: `${wall.time}:00` }
  }

  const b90m = addMinutes(90) // Eligible for 2h reminder
  const b8m = addMinutes(8)   // Eligible for 10m reminder
  const b180m = addMinutes(180) // Too far (3h away)

  const mockBookings = [
    {
      id: 101,
      user_id: 1,
      booking_date: b90m.date,
      start_time: b90m.time,
      status: "confirmed",
      customer: { customer_name: "John Doe" },
      booking_services: [{ service: { service_name: "Haircut" } }],
    },
    {
      id: 102,
      user_id: 1,
      booking_date: b8m.date,
      start_time: b8m.time,
      status: "confirmed",
      customer: { customer_name: "Jane Smith" },
      booking_services: [{ service: { service_name: "Coloring" } }],
    },
    {
      id: 103,
      user_id: 1,
      booking_date: b180m.date,
      start_time: b180m.time,
      status: "confirmed",
      customer: { customer_name: "Late Client" },
      booking_services: [],
    },
  ]

  const insertedEvents: Array<Record<string, unknown>> = []

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
          }),
        }
      }
      if (table === "notification_events") {
        return {
          insert: (event: Record<string, unknown>) => ({
            select: () => ({
              maybeSingle: async () => {
                insertedEvents.push(event)
                return { data: { id: insertedEvents.length, ...event }, error: null }
              },
            }),
          }),
        }
      }
      return {}
    },
  } as unknown as Parameters<typeof scanBookingReminders>[0]

  const result = await scanBookingReminders(mockSupabase)

  assert.equal(result.enqueued, 2)
  assert.equal(result.enqueued2h, 1)
  assert.equal(result.enqueued10m, 1)
  assert.equal(insertedEvents.length, 2)

  // Check 2h reminder event
  const event2h = insertedEvents.find((e) => e.entity_id === 101)
  assert.ok(event2h)
  assert.equal(event2h.event_type, BOOKING_REMINDER_2H_EVENT_TYPE)
  assert.equal(event2h.title, "Upcoming booking in 2 hours")
  assert.ok(typeof event2h.body === "string" && event2h.body.includes("John Doe"))
  assert.ok(typeof event2h.body === "string" && event2h.body.includes("Haircut"))

  // Check 10m reminder event
  const event10m = insertedEvents.find((e) => e.entity_id === 102)
  assert.ok(event10m)
  assert.equal(event10m.event_type, BOOKING_REMINDER_10M_EVENT_TYPE)
  assert.equal(event10m.title, "Upcoming booking in 10 minutes")
  assert.ok(typeof event10m.body === "string" && event10m.body.includes("Jane Smith"))
  assert.ok(typeof event10m.body === "string" && event10m.body.includes("Coloring"))
})

