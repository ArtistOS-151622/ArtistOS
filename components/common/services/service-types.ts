export type ArtistService = {
  id: number
  service_name: string
  duration_minutes: number
  price: number | string
  created_at?: string
}

export type ServiceFormValues = {
  service_name: string
  duration_minutes: number
  price: string
}

export const durationOptions = [
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "1.5 hr", value: 90 },
  { label: "2 hr", value: 120 },
  { label: "3 hr", value: 180 },
  { label: "4 hr", value: 240 },
  { label: "6 hr", value: 360 },
]

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`
}

export function formatPrice(price: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(price))
}
