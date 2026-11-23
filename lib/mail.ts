export function smtpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.SMTP_ENABLED === "true" &&
      env.SMTP_HOST?.trim() &&
      env.SMTP_PORT?.trim() &&
      env.SMTP_USER?.trim() &&
      env.SMTP_PASSWORD &&
      env.SMTP_FROM?.trim()
  )
}

export function smtpStatus(env: NodeJS.ProcessEnv = process.env) {
  return {
    configured: smtpConfigured(env),
    simulation: false,
  }
}

/**
 * Future SMTP delivery. Production never stores or pretends to send a message.
 * Wiring a real transport stays inside this function.
 */
export async function sendAccountEmail(
  _message: { to: string; subject: string; text: string },
  env: NodeJS.ProcessEnv = process.env
): Promise<{ delivered: false; simulated: false }> {
  if (env.NODE_ENV === "production" && env.SMTP_ALLOW_SIMULATE === "true") {
    return { delivered: false, simulated: false }
  }
  if (!smtpConfigured(env)) return { delivered: false, simulated: false }
  return { delivered: false, simulated: false }
}
