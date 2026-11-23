export type RecoveryChannel = "admin" | "smtp" | "sms"

export function recoveryChannel(env: NodeJS.ProcessEnv = process.env): RecoveryChannel {
  const raw = (env.ACCOUNT_RECOVERY_CHANNEL || "admin").trim().toLowerCase()
  if (raw === "smtp" || raw === "sms") return raw
  return "admin"
}

export function recoveryStatus(env: NodeJS.ProcessEnv = process.env) {
  return { channel: recoveryChannel(env) }
}
