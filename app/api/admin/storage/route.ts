import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select(`
        id, artist_name, studio_name, phone, email,
        portfolio_storage_quotas (free_storage_bytes, purchase_storage_bytes, used_storage_bytes),
        portfolio_storage_purchases (
          id, storage_bytes, base_amount, gst_amount, amount, status, created_at, payment_method, quantity,
          rp_order_id, rp_payment_id, rp_subscription_id,
          storage_plans (name)
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    const formattedData = users.map((user: any) => {
      const rawQuota = user.portfolio_storage_quotas
      const quota = Array.isArray(rawQuota) ? rawQuota[0] : rawQuota
      const finalQuota = quota || { free_storage_bytes: 10000000, purchase_storage_bytes: 0, used_storage_bytes: 0 }
      
      const allPurchases = user.portfolio_storage_purchases || []
      
      // Filter out abandoned checkouts (keep active, completed, cancelled, failed, etc but mostly successful ones for history)
      // The user requested to see "history detail with date and amount and plan".
      // Let's include completed/active ones in history.
      const history = allPurchases
        .filter((p: any) => p.status === 'completed' || p.status === 'active')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      const hasActivePlan = history.length > 0
      const status = hasActivePlan ? 'active' : 'pending' // 'pending' means they haven't bought any plan yet
      
      return {
        id: user.id,
        artist: {
          name: user.artist_name,
          studio: user.studio_name,
          phone: user.phone,
          email: user.email
        },
        storage: {
          free: Number(finalQuota.free_storage_bytes || 0),
          purchased: Number(finalQuota.purchase_storage_bytes || 0),
          used: Number(finalQuota.used_storage_bytes || 0)
        },
        status,
        total_spent: history.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        history
      }
    })

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error fetching admin storage purchases:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
