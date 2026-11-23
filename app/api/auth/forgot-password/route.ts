import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { issueOtp } from "@/lib/otp-delivery"
import { smsConfigured } from "@/lib/sms"
import { classifyIdentifier } from "@/lib/account-identity"
import { recoveryChannel } from "@/lib/recovery-policy"
import { sendAccountEmail, smtpConfigured } from "@/lib/mail"
import { findAccountsByIdentifier } from "@/lib/account-directory"

const schema = z.object({
  phone: z.string().optional(),
  identifier: z.string().optional(),
})

const ASSISTANCE_MESSAGE =
  "Si un compte correspond à cet identifiant, la demande d'assistance a été enregistrée. Un administrateur peut rétablir l'accès après un contrôle d'identité. Aucun message automatique n'est envoyé."

const SMS_MESSAGE =
  "Si ce numéro correspond à un compte dont le téléphone a été vérifié, un code a été envoyé. Sinon, un administrateur rétablit l'accès après un contrôle d'identité."

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = schema.safeParse(body)
    const raw = (validation.success ? validation.data.identifier || validation.data.phone || "" : "").trim()
    const classified = classifyIdentifier(raw)
    if (!validation.success || !classified) {
      return NextResponse.json(
        { success: false, error: "Indiquez un téléphone ou un e-mail valide", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const channel = recoveryChannel()
    if (channel === "sms" && classified.kind === "phone") {
      return smsReset(classified.phone)
    }

    const recent = await prisma.passwordAssistanceRequest.count({
      where: { identifier: classified.kind === "email" ? classified.email : classified.phone, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    })
    if (recent >= 5) {
      return NextResponse.json(
        { success: false, error: "Trop de demandes. Réessayez plus tard.", code: "ASSISTANCE_RATE_LIMIT" },
        { status: 429 }
      )
    }

    await prisma.passwordAssistanceRequest.create({
      data: { identifier: classified.kind === "email" ? classified.email : classified.phone },
    })

    if (channel === "smtp" && classified.kind === "email" && smtpConfigured()) {
      const found = await findAccountsByIdentifier(classified.email)
      if (found.status === "ok" && found.user && !found.user.deletedAt) {
        await sendAccountEmail({
          to: classified.email,
          subject: "Assistance WAGESSE",
          text: "Une demande d'assistance a été enregistrée. Aucun mot de passe n'est inclus dans ce message.",
        })
      }
    }

    return NextResponse.json({ success: true, message: ASSISTANCE_MESSAGE })
  } catch (error) {
    console.error("Forgot password error:", error instanceof Error ? error.name : "error")
    return NextResponse.json({ success: false, error: "Internal server error", code: "SERVER_ERROR" }, { status: 500 })
  }
}

async function smsReset(phone: string) {
  const generic = { success: true, message: SMS_MESSAGE }
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, status: true, deletedAt: true, phoneVerified: true },
  })
  if (!user || user.deletedAt || user.status === "DELETED" || !user.phoneVerified || !smsConfigured()) {
    return NextResponse.json(generic)
  }

  const issued = await issueOtp(phone, "reset")
  if (!issued.ok) {
    return NextResponse.json(
      { success: false, error: "Trop de demandes de code. Réessayez plus tard.", code: "OTP_RATE_LIMIT" },
      { status: 429 }
    )
  }

  return NextResponse.json({
    success: true,
    message: generic.message,
    data: {
      smsDelivered: issued.delivered,
      ...(issued.debugOtp ? { debugOtp: issued.debugOtp } : {}),
    },
    ...(issued.debugOtp ? { debugOtp: issued.debugOtp } : {}),
  })
}
