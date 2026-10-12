import assert from "node:assert/strict"
import test from "node:test"
import { convertInquiryToBooking } from "../lib/inquiries/queries.ts"

test("convertInquiryToBooking creates booking with confirmed status", async () => {
  let insertedBookingStatus = ""
  let insertedBookingId = 999
  let updatedInquiryStatus = ""
  let updatedBookingId: number | null = null

  const mockSupabase: any = {
    from: (table: string) => {
      if (table === "inquiries") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 12,
                    user_id: 1,
                    customer_id: 5,
                    booking_address: "123 Street",
                    booking_date: "2026-10-15",
                    start_time: "10:00",
                    end_time: "12:00",
                    status: "new",
                    additional_request: "None",
                    inquiry_services: [],
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: (fields: any) => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => {
                    updatedInquiryStatus = fields.status
                    updatedBookingId = fields.booking_id
                    return {
                      data: {
                        id: 12,
                        user_id: 1,
                        customer_id: 5,
                        booking_address: "123 Street",
                        booking_date: "2026-10-15",
                        start_time: "10:00",
                        end_time: "12:00",
                        status: fields.status,
                        booking_id: fields.booking_id,
                        additional_request: "None",
                        inquiry_services: [],
                      },
                      error: null,
                    }
                  },
                }),
              }),
            }),
          }),
        }
      }

      if (table === "bookings") {
        return {
          insert: (record: any) => {
            insertedBookingStatus = record.status
            return {
              select: () => ({
                single: async () => ({
                  data: { id: insertedBookingId },
                  error: null,
                }),
              }),
            }
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: insertedBookingId,
                  user_id: 1,
                  customer_id: 5,
                  booking_date: "2026-10-15",
                  start_time: "10:00",
                  status: "confirmed",
                  discount: 0,
                  customer: { customer_name: "John", phone: "9876543210" },
                  artist: { artist_name: "Artist", studio_name: "Studio" },
                  booking_services: [],
                  booking_additional_charges: [],
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
                data: { created_at: new Date().toISOString(), is_free_user: true },
                error: null,
              }),
            }),
          }),
        }
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      }
    },
  }

  const result = await convertInquiryToBooking(mockSupabase, 12, 1)

  assert.equal("error" in result, false)
  assert.equal(insertedBookingStatus, "confirmed", "Booking should be created with status 'confirmed'")
  assert.equal(updatedInquiryStatus, "booked")
  assert.equal(updatedBookingId, insertedBookingId)
})
