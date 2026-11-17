import { createDbClient } from "#src/integrations/supabase.js"
import { validateService } from "#src/modules/services/services.validation.js"
import { assertWritable } from "#src/shared/subscription/read-only.js"
import { badRequest } from "#src/utils/api-error.js"

const FIELDS = "id, service_name, duration_minutes, price, created_at"

function validOrThrow(body) {
  const result = validateService(body)
  if (result.error) throw badRequest(result.error)
  return result.data
}

/** sort: "price_asc" | "price_desc" | "name_asc" | default newest first. */
export async function listServices(userId, { search, sort }) {
  let query = createDbClient().from("services").select(FIELDS).eq("user_id", userId)

  if (search) query = query.ilike("service_name", `%${search}%`)

  if (sort === "price_asc") query = query.order("price", { ascending: true })
  else if (sort === "price_desc") query = query.order("price", { ascending: false })
  else if (sort === "name_asc") query = query.order("service_name", { ascending: true })
  else query = query.order("id", { ascending: false })

  const { data, error } = await query
  if (error) throw badRequest(error.message)
  return { services: data ?? [] }
}

export async function createService(userId, body) {
  const data = validOrThrow(body)
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to create services.")

  const { data: service, error } = await supabase
    .from("services")
    .insert({ ...data, user_id: userId })
    .select(FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  return { service }
}

export async function updateService(userId, id, body) {
  const data = validOrThrow(body)
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to edit services.")

  const { data: service, error } = await supabase
    .from("services")
    .update(data)
    .eq("id", id)
    .eq("user_id", userId)
    .select(FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  return { service }
}

export async function deleteService(userId, id) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to delete services.")

  const { error } = await supabase.from("services").delete().eq("id", id).eq("user_id", userId)
  if (error) throw badRequest(error.message)
  return { success: true }
}
