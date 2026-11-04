import assert from "node:assert/strict"
import test from "node:test"
import { convertInquiryToBooking } from "../lib/inquiries/queries.ts"

const baseInquiry = {
  id: 12,
  user_id: 1,
  customer_id: 5,
  booking_id: null,
  booking_address: "123 Street",
  booking_date: "2026-10-15",
  start_time: "10:00",
  end_time: "12:00",
  status: "new",
  additional_request: "None",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  customer: [],
  inquiry_services: [],
}

/** Chainable stand-in for a PostgREST filter builder: every filter returns itself. */
function chain(result: () => Promise<unknown>) {
  const builder: Record<string, unknown> = {}
  for (const method of ["eq", "neq", "is", "in"]) builder[method] = () => builder
  builder.select = () => builder
  builder.single = result
  builder.maybeSingle = result
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    result().then(resolve, reject)
  return builder
}

function createMockSupabase(options: { inquiryAlreadyConverted?: boolean } = {}) {
  const calls = {
    insertedBookingStatus: "",
    updatedInquiryStatus: "",
    updatedBookingId: null as number | null,
    deletedBookingId: false,
  }
  const insertedBookingId = 999

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal Supabase mock
  const mockSupabase: any = {
    from: (table: string) => {
      if (table === "inquiries") {
        return {
          update: (fields: { status: string; booking_id: number | null }) =>
            chain(async () => {
              if (options.inquiryAlreadyConverted) return { data: null, error: null }
              calls.updatedInquiryStatus = fields.status
              calls.updatedBookingId = fields.booking_id
              return {
                data: { status: fields.status, booking_id: fields.booking_id, updated_at: "2026-10-02T00:00:00Z" },
                error: null,
              }
            }),
        }
      }

      if (table === "bookings") {
        return {
          insert: (record: { status: string }) => {
            calls.insertedBookingStatus = record.status
            return chain(async () => ({ data: { id: insertedBookingId }, error: null }))
          },
          delete: () =>
            chain(async () => {
              calls.deletedBookingId = true
              return { error: null }
            }),
        }
      }

      if (table === "booking_services") {
        return { insert: () => chain(async () => ({ error: null })) }
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }

  return { mockSupabase, calls, insertedBookingId }
}

test("convertInquiryToBooking creates booking with confirmed status", async () => {
  const { mockSupabase, calls, insertedBookingId } = createMockSupabase()

  const result = await convertInquiryToBooking(mockSupabase, { ...baseInquiry }, 1)

  assert.equal("error" in result, false)
  assert.equal(calls.insertedBookingStatus, "confirmed", "Booking should be created with status 'confirmed'")
  assert.equal(calls.updatedInquiryStatus, "booked")
  assert.equal(calls.updatedBookingId, insertedBookingId)
  assert.equal("booking_id" in result && result.booking_id, insertedBookingId)
})

test("convertInquiryToBooking removes the new booking if the inquiry was converted concurrently", async () => {
  const { mockSupabase, calls } = createMockSupabase({ inquiryAlreadyConverted: true })

  const result = await convertInquiryToBooking(mockSupabase, { ...baseInquiry }, 1)

  assert.equal("error" in result, true)
  assert.equal(calls.deletedBookingId, true, "Orphan booking should be deleted")
})

test("convertInquiryToBooking returns existing booking for an already booked inquiry", async () => {
  const { mockSupabase, calls } = createMockSupabase()

  const result = await convertInquiryToBooking(mockSupabase, { ...baseInquiry, status: "booked", booking_id: 77 }, 1)

  assert.equal("booking_id" in result && result.booking_id, 77)
  assert.equal(calls.insertedBookingStatus, "", "No new booking should be created")
})
