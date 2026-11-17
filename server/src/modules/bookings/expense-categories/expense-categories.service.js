import { createDbClient } from "#src/integrations/supabase.js"
import { bookingBelongsToUser, parseChildId } from "#src/modules/bookings/guards.js"
import { assertWritable } from "#src/shared/subscription/read-only.js"
import { badRequest, notFound } from "#src/utils/api-error.js"

const FIELDS = "id, category_name, created_at"
const READ_ONLY_MESSAGE = "Your subscription has expired. Please upgrade to update expense categories."

function categoryName(body) {
  const name = typeof body.category_name === "string" ? body.category_name.trim() : ""
  if (!name) throw badRequest("Category name is required.")
  return name
}

export async function listCategories(userId, bookingId) {
  const supabase = createDbClient()
  const [owns, { data, error }] = await Promise.all([
    bookingBelongsToUser(supabase, bookingId, userId),
    supabase
      .from("booking_expense_categories")
      .select(FIELDS)
      .eq("booking_id", bookingId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ])
  if (!owns) throw notFound("Booking not found.")
  if (error) throw badRequest(error.message)
  return { categories: data ?? [] }
}

export async function addCategory(userId, bookingId, body) {
  const category_name = categoryName(body)
  const supabase = createDbClient()

  const [owns] = await Promise.all([
    bookingBelongsToUser(supabase, bookingId, userId),
    assertWritable(supabase, userId, READ_ONLY_MESSAGE),
  ])
  if (!owns) throw notFound("Booking not found.")

  const { data, error } = await supabase
    .from("booking_expense_categories")
    .insert({ user_id: userId, booking_id: bookingId, category_name })
    .select(FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  return { category: data }
}

export async function renameCategory(userId, bookingId, body) {
  const categoryId = parseChildId(body.categoryId, "category")
  const category_name = categoryName(body)
  const supabase = createDbClient()
  await assertWritable(supabase, userId, READ_ONLY_MESSAGE)

  const { data, error } = await supabase
    .from("booking_expense_categories")
    .update({ category_name })
    .eq("id", categoryId)
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .select(FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  if (!data) throw notFound("Category not found.")
  return { category: data }
}

export async function deleteCategory(userId, bookingId, rawCategoryId) {
  const categoryId = parseChildId(rawCategoryId, "category")
  const supabase = createDbClient()
  await assertWritable(supabase, userId, READ_ONLY_MESSAGE)

  const { error } = await supabase
    .from("booking_expense_categories")
    .delete()
    .eq("id", categoryId)
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
  if (error) throw badRequest(error.message)
  return { success: true }
}
