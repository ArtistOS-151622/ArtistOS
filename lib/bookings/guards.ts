import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * True when the booking exists and belongs to the artist.
 * Run it inside Promise.all with the route's other independent queries
 * so the ownership check doesn't add its own round trip.
 */
export async function bookingBelongsToUser(
  supabase: SupabaseClient,
  bookingId: number,
  userId: number,
): Promise<boolean> {
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("user_id", userId)
    .maybeSingle()
  return !!data
}
