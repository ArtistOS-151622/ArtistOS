import { createDbClient } from "#src/integrations/supabase.js"
import { bookingBelongsToUser, parseChildId } from "#src/modules/bookings/guards.js"
import { assertWritable } from "#src/shared/subscription/read-only.js"
import { badRequest, notFound } from "#src/utils/api-error.js"

const FIELDS = "id, expense_name, amount, expense_date, description, created_at"
const READ_ONLY_MESSAGE = "Your subscription has expired. Please upgrade to update booking expenses."

function validateExpense(body) {
  const name = typeof body.expense_name === "string" ? body.expense_name.trim() : ""
  if (!name) throw badRequest("Expense name is required.")
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest("Amount must be a positive number.")
  if (!body.expense_date) throw badRequest("Expense date is required.")
  return {
    expense_name: name,
    amount,
    expense_date: body.expense_date,
    description: (typeof body.description === "string" && body.description.trim()) || null,
  }
}

export async function listExpenses(userId, bookingId) {
  const supabase = createDbClient()
  const [owns, { data, error }] = await Promise.all([
    bookingBelongsToUser(supabase, bookingId, userId),
    supabase
      .from("booking_expenses")
      .select(FIELDS)
      .eq("booking_id", bookingId)
      .eq("user_id", userId)
      .order("expense_date", { ascending: false }),
  ])
  if (!owns) throw notFound("Booking not found.")
  if (error) throw badRequest(error.message)
  return { expenses: data ?? [] }
}

export async function addExpense(userId, bookingId, body) {
  const expense = validateExpense(body)
  const supabase = createDbClient()

  const [owns] = await Promise.all([
    bookingBelongsToUser(supabase, bookingId, userId),
    assertWritable(supabase, userId, READ_ONLY_MESSAGE),
  ])
  if (!owns) throw notFound("Booking not found.")

  const { data, error } = await supabase
    .from("booking_expenses")
    .insert({ user_id: userId, booking_id: bookingId, ...expense })
    .select(FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  return { expense: data }
}

export async function updateExpense(userId, bookingId, body) {
  const expenseId = parseChildId(body.expenseId, "expense")
  const expense = validateExpense(body)
  const supabase = createDbClient()
  await assertWritable(supabase, userId, READ_ONLY_MESSAGE)

  const { data, error } = await supabase
    .from("booking_expenses")
    .update(expense)
    .eq("id", expenseId)
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .select(FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  if (!data) throw notFound("Expense not found.")
  return { expense: data }
}

export async function deleteExpense(userId, bookingId, rawExpenseId) {
  const expenseId = parseChildId(rawExpenseId, "expense")
  const supabase = createDbClient()
  await assertWritable(supabase, userId, READ_ONLY_MESSAGE)

  const { error } = await supabase
    .from("booking_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
  if (error) throw badRequest(error.message)
  return { success: true }
}
