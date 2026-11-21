import { smsConfigured } from "@/lib/sms"

/** Exact opt-in. Any other value, including an absent variable, keeps SMS optional. */
export function phoneVerificationRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PHONE_VERIFICATION_REQUIRED === "true"
}

/** Mode B cannot be used until an SMS provider can actually deliver a code. */
export function phoneVerificationMisconfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return phoneVerificationRequired(env) && !smsConfigured(env)
}

export function phoneVerificationStatus(env: NodeJS.ProcessEnv = process.env) {
  const required = phoneVerificationRequired(env)
  const configured = smsConfigured(env)
  return {
    required,
    configured,
    misconfigured: required && !configured,
  }
}
