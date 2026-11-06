import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parsePaydunyaNotice, paydunyaHashMatches, readPaydunyaEnv } from "@/lib/paydunya"
import { paymentServiceLayer } from "@/lib/services/payment-service"

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && process.env.PAYDUNYA_ENABLED !== "true") {
      return NextResponse.json({ success: false, error: "PayDunya désactivé" }, { status: 403 })
    }

    const contentType = request.headers.get("content-type") || ""
    let raw: Record<string, unknown>
    if (contentType.includes("application/json")) {
      raw = await request.json()
    } else {
      const form = await request.formData()
      raw = Object.fromEntries(form.entries())
    }

    const notice = parsePaydunyaNotice(raw)
    const config = readPaydunyaEnv()
    if (!paydunyaHashMatches(config.masterKey || "", notice.hash) || !notice.token) {
      return NextResponse.json({ success: false, error: "Notification refusée" }, { status: 401 })
    }

    const payment = await prisma.payment.findFirst({
      where: { providerName: "paydunya", providerReference: notice.token },
    })

    await prisma.paymentWebhook.create({
      data: {
        provider: "paydunya",
        eventType: notice.status || "unknown",
        data: {
          status: notice.status || null,
          token: notice.token,
          amount: notice.amount ?? null,
        },
        signature: "verified",
        processed: false,
      },
    })

    if (!payment) {
      return NextResponse.json({ success: false, error: "Paiement introuvable" }, { status: 404 })
    }

    await paymentServiceLayer.finalizePaydunya(payment.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[POST /api/payments/paydunya/webhook]", error)
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
