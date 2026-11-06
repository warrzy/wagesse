export type SmsProviderName = "simulate" | "http"

export type SmsResult = {
  delivered: boolean
  provider: SmsProviderName
  simulated: boolean
}

type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean }>

const simulatedMessages = new Map<string, string>()

export function smsProviderName(env: NodeJS.ProcessEnv = process.env): SmsProviderName {
  const raw = (env.SMS_PROVIDER || "").trim().toLowerCase()
  if (raw === "http") return "http"
  if (raw === "simulate") return "simulate"
  return env.NODE_ENV === "production" ? "http" : "simulate"
}

export function smsSimulationAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (smsProviderName(env) !== "simulate") return false
  if (env.NODE_ENV === "production") return env.SMS_ALLOW_SIMULATE === "true"
  return true
}

export function smsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  if (smsProviderName(env) === "simulate") return smsSimulationAllowed(env)
  return Boolean(env.SMS_HTTP_URL?.trim() && env.SMS_HTTP_KEY?.trim())
}

export function smsStatus(env: NodeJS.ProcessEnv = process.env) {
  const provider = smsProviderName(env)
  return {
    provider,
    configured: smsConfigured(env),
    simulation: provider === "simulate",
  }
}

export function toBurkinaMsisdn(phone: string, env: NodeJS.ProcessEnv = process.env): string {
  const digits = phone.replace(/\D/g, "")
  const prefix = (env.SMS_COUNTRY_CODE || "226").replace(/\D/g, "") || "226"
  if (digits.startsWith(prefix) && digits.length > prefix.length) return digits
  return `${prefix}${digits}`
}

export function readSimulatedSms(phone: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!smsSimulationAllowed(env)) return undefined
  return simulatedMessages.get(toBurkinaMsisdn(phone, env))
}

export function clearSimulatedSms(): void {
  simulatedMessages.clear()
}

export async function sendSms(
  phone: string,
  message: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch
): Promise<SmsResult> {
  const provider = smsProviderName(env)
  const to = toBurkinaMsisdn(phone, env)

  if (provider === "simulate") {
    if (!smsSimulationAllowed(env)) {
      return { delivered: false, provider, simulated: true }
    }
    simulatedMessages.set(to, message)
    return { delivered: true, provider, simulated: true }
  }

  const url = env.SMS_HTTP_URL?.trim()
  const key = env.SMS_HTTP_KEY?.trim()
  if (!url || !key) {
    return { delivered: false, provider, simulated: false }
  }

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        sender: (env.SMS_SENDER || "WAGESSE").trim(),
        message,
      }),
    })
    return { delivered: response.ok, provider, simulated: false }
  } catch {
    return { delivered: false, provider, simulated: false }
  }
}
