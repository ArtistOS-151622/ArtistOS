import { createDbClient } from "#src/integrations/supabase.js"
import { validateCustomer } from "#src/modules/customers/customers.validation.js"
import { assertWritable } from "#src/shared/subscription/read-only.js"
import { badRequest } from "#src/utils/api-error.js"

// customer_stats view: includes the computed booking_count.
const READ_FIELDS = "id, customer_name, phone, alt_phone, email, address, reference_by, created_at, booking_count"
// Base customers table (no booking_count).
const WRITE_FIELDS = "id, customer_name, phone, alt_phone, email, address, reference_by, created_at"
const MAX_PAGE_SIZE = 1000
const DEFAULT_PAGE_SIZE = 20
// The frontend matches on this exact string.
const PHONE_EXISTS = "phone_exists"

function validOrThrow(body) {
  const result = validateCustomer(body)
  if (result.error) throw badRequest(result.error)
  return result.data
}

/** → { customers, hasMore }. sort: "name" | "most_bookings" | "recent" (default). */
export async function listCustomers(userId, { search, sort, page, limit }) {
  const pageSize = Math.min(MAX_PAGE_SIZE, limit || DEFAULT_PAGE_SIZE)
  const from = (page - 1) * pageSize

  let query = createDbClient().from("customer_stats").select(READ_FIELDS, { count: "exact" }).eq("user_id", userId)

  if (search) query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)

  if (sort === "name") query = query.order("customer_name", { ascending: true })
  else if (sort === "most_bookings") query = query.order("booking_count", { ascending: false })
  else query = query.order("id", { ascending: false })

  const { data, count, error } = await query.range(from, from + pageSize - 1)
  if (error) throw badRequest(error.message)

  return { customers: data ?? [], hasMore: (count ?? 0) > page * pageSize }
}

async function findPhoneDuplicate(supabase, userId, phone, excludeId) {
  let query = supabase.from("customers").select("id").eq("user_id", userId).eq("phone", phone)
  if (excludeId) query = query.neq("id", excludeId)
  return query.limit(1)
}

export async function createCustomer(userId, body) {
  const data = validOrThrow(body)
  const supabase = createDbClient()

  const [, duplicate] = await Promise.all([
    assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to create customers."),
    findPhoneDuplicate(supabase, userId, data.phone),
  ])
  if (duplicate.error) throw badRequest(duplicate.error.message)
  if ((duplicate.data ?? []).length > 0) throw badRequest(PHONE_EXISTS)

  const { data: inserted, error } = await supabase
    .from("customers")
    .insert({ ...data, user_id: userId })
    .select(WRITE_FIELDS)
    .single()
  if (error) throw badRequest(error.message)

  // New customer: no bookings yet, so no need to re-read the stats view.
  return { customer: { ...inserted, booking_count: 0 } }
}

export async function updateCustomer(userId, id, body) {
  const data = validOrThrow(body)
  const supabase = createDbClient()

  const [, duplicate] = await Promise.all([
    assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to edit customers."),
    findPhoneDuplicate(supabase, userId, data.phone, id),
  ])
  if (duplicate.error) throw badRequest(duplicate.error.message)
  if ((duplicate.data ?? []).length > 0) throw badRequest(PHONE_EXISTS)

  const { data: customer, error } = await supabase
    .from("customers")
    .update(data)
    .eq("id", id)
    .eq("user_id", userId)
    .select(WRITE_FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  return { customer }
}

export async function deleteCustomer(userId, id) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to delete customers.")

  const { error } = await supabase.from("customers").delete().eq("id", id).eq("user_id", userId)
  if (error) throw badRequest(error.message)
  return { success: true }
}
