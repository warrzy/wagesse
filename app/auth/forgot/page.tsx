"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [channel, setChannel] = useState<"admin" | "smtp" | "sms">("admin")
  const [step, setStep] = useState<"request" | "reset">("request")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiClient.recoveryPolicy().then((res) => {
      const next = (res.data as { channel?: "admin" | "smtp" | "sms" } | undefined)?.channel
      if (next) setChannel(next)
    })
  }, [])

  const requestHelp = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const res = await apiClient.forgotPassword(identifier)
    setLoading(false)
    if (!res.success) {
      setError(res.error || "Demande impossible")
      return
    }
    setInfo(res.message || "Si un compte correspond, la demande a été enregistrée.")
    if (channel === "sms") setStep("reset")
  }

  const reset = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const res = await apiClient.resetPassword({ phone: identifier, code, password })
    setLoading(false)
    if (!res.success) {
      setError(res.error || "Réinitialisation impossible")
      return
    }
    router.push("/auth/login")
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] to-white pt-20 pb-12">
        <div className="container-max max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold mb-2 text-center">Mot de passe oublié</h1>
            <p className="text-gray-600 text-center mb-8">
              {channel === "sms"
                ? "Un code SMS permet de choisir un nouveau mot de passe lorsque ce canal est activé."
                : "Indiquez votre téléphone ou votre e-mail. Un administrateur rétablit l'accès après un contrôle d'identité. La réponse ne dit pas si le compte existe."}
            </p>
            {error ? <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div> : null}
            {info ? <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{info}</div> : null}
            {step === "request" ? (
              <form onSubmit={requestHelp} className="space-y-4">
                <input
                  className="input-field"
                  aria-label="Téléphone ou e-mail"
                  placeholder="Téléphone ou e-mail"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#FF7900] text-[#071D40] rounded-lg font-semibold disabled:opacity-50">
                  {loading ? "Envoi…" : channel === "sms" ? "Recevoir le code" : "Demander une assistance"}
                </button>
              </form>
            ) : (
              <form onSubmit={reset} className="space-y-4">
                <input className="input-field" aria-label="Code" placeholder="Code à 6 chiffres" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required />
                <input className="input-field" aria-label="Nouveau mot de passe" placeholder="Nouveau mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#FF7900] text-[#071D40] rounded-lg font-semibold disabled:opacity-50">
                  {loading ? "Mise à jour…" : "Enregistrer"}
                </button>
              </form>
            )}
            <p className="mt-6 text-center text-sm">
              <Link href="/auth/login" className="text-[#FF7900] font-semibold">Retour à la connexion</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
