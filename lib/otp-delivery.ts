import { assertOtpSendAllowed, exposeOtpForTests, generateOTP, recordOtpSend, storeOTP } from "@/lib/auth"
import { sendSms } from "@/lib/sms"

export type OtpPurpose = "verify" | "reset"

export function otpKey(phone: string, purpose: OtpPurpose): string {
  return purpose === "reset" ? `reset:${phone}` : phone
}

function messageFor(code: string, purpose: OtpPurpose): string {
  if (purpose === "reset") {
    return `WAGESSE : code de réinitialisation ${code}. Il expire dans 10 minutes.`
  }
  return `WAGESSE : code de vérification ${code}. Il expire dans 10 minutes.`
}

export async function issueOtp(phone: string, purpose: OtpPurpose) {
  const allowed = assertOtpSendAllowed(phone)
  if (!allowed.ok) return { ok: false as const, reason: allowed.reason }

  const code = generateOTP()
  storeOTP(otpKey(phone, purpose), code)
  recordOtpSend(phone)
  const sms = await sendSms(phone, messageFor(code, purpose))
  return {
    ok: true as const,
    delivered: sms.delivered,
    debugOtp: exposeOtpForTests(code),
  }
}
