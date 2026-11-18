import { toast } from "sonner";

import { api, getErrorMessage, isApiError } from "@/lib/api";

type SubmitBookingResponse<B> = { booking?: B; requestId?: string };

/**
 * Creates (POST) or updates (PATCH, when `bookingId` is set) a booking.
 *
 * `requestId` goes out as `x-booking-request-id` and comes back in every error
 * body; it is shown in the error toast so support can find the server logs.
 * Shows the error toast itself and resolves to null on failure.
 */
export async function submitBooking<B>(
  payload: unknown,
  requestId: string,
  bookingId?: number,
): Promise<B | null> {
  const config = { headers: { "x-booking-request-id": requestId } };

  try {
    const { data } = bookingId
      ? await api.patch<SubmitBookingResponse<B>>(`/api/bookings/${bookingId}`, payload, config)
      : await api.post<SubmitBookingResponse<B>>("/api/bookings", payload, config);

    if (data.booking) return data.booking;
    toast.error(`Unable to save booking. Reference: ${data.requestId ?? requestId}`);
    return null;
  } catch (err) {
    if (isApiError(err) && err.status !== 0) {
      const failureId = (err.info as SubmitBookingResponse<B> | null)?.requestId ?? requestId;
      console.error("[BookingSave] API request failed", { requestId: failureId, status: err.status, error: err.message });
      toast.error(`${getErrorMessage(err, "Unable to save booking.")} Reference: ${failureId}`);
    } else {
      console.error("[BookingSave] Network or client failure", { requestId, error: err });
      toast.error(`Unable to save booking. Please check the connection and try again. Reference: ${requestId}`);
    }
    return null;
  }
}
