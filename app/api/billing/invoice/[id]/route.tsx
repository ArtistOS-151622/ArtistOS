import { renderToStream } from "@react-pdf/renderer"
import { type NextRequest, NextResponse } from "next/server"

import { InvoicePdf } from "@/components/pdf/invoice-pdf"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const awaitedParams = await params
  const idParam = awaitedParams.id

  if (!idParam.includes("_")) {
    return new NextResponse("Invalid invoice ID", { status: 400 })
  }

  const [type, idStr] = idParam.split("_")
  const id = parseInt(idStr, 10)

  if (isNaN(id) || (type !== "platform" && type !== "storage")) {
    return new NextResponse("Invalid invoice ID", { status: 400 })
  }

  const supabase = await createClient()

  try {
    // Get user details
    const { data: user } = await supabase
      .from("users")
      .select("artist_name, studio_name")
      .eq("id", session.id)
      .single()

    let invoiceData

    if (type === "platform") {
      const { data, error } = await supabase
        .from("platform_payments")
        .select("*")
        .eq("id", id)
        .eq("user_id", session.id)
        .single()
      
      if (error || !data) throw new Error("Invoice not found")
      
      invoiceData = {
        invoiceNumber: data.invoice_number || `PLT-${data.id}`,
        date: data.created_at,
        planName: data.plan_name,
        status: data.status,
        amount: data.amount,
      }
    } else {
      const { data, error } = await supabase
        .from("portfolio_storage_purchases")
        .select("*, storage_plans(name)")
        .eq("id", id)
        .eq("user_id", session.id)
        .single()
      
      if (error || !data) throw new Error("Invoice not found")
      
      invoiceData = {
        invoiceNumber: data.rp_order_id || data.rp_payment_id || `STG-${data.id}`,
        date: data.created_at,
        planName: data.storage_plans?.name ? `Storage: ${data.storage_plans.name}` : "Storage Add-on",
        status: data.status,
        amount: data.amount,
      }
    }

    const stream = await renderToStream(
      <InvoicePdf
        {...invoiceData}
        userName={user?.artist_name}
        studioName={user?.studio_name}
      />
    )

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice-${invoiceData.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating invoice PDF:", error)
    return new NextResponse("Invoice not found or could not be generated", { status: 404 })
  }
}
