"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [step, setStep] = useState<"phone" | "reset">("phone")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const requestCode = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const res = await apiClient.forgotPassword(phone)
    setLoading(false)
    if (!res.success) {
      setError(res.error || "Demande impossible")
      return
    }
    setInfo(res.message || "Si ce numéro a un compte, un code a été envoyé.")
    setStep("reset")
  }

  const reset = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const res = await apiClient.resetPassword({ phone, code, password })
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
            <p className="text-gray-600 text-center mb-8">Un code SMS permet de choisir un nouveau mot de passe.</p>
            {error ? <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div> : null}
            {info ? <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{info}</div> : null}
            {step === "phone" ? (
              <form onSubmit={requestCode} className="space-y-4">
                <input className="input-field" aria-label="Numéro de téléphone" placeholder="Numéro de téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#E8714D] text-white rounded-lg font-semibold disabled:opacity-50">
                  {loading ? "Envoi…" : "Recevoir le code"}
                </button>
              </form>
            ) : (
              <form onSubmit={reset} className="space-y-4">
                <input className="input-field" aria-label="Code" placeholder="Code à 6 chiffres" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required />
                <input className="input-field" aria-label="Nouveau mot de passe" placeholder="Nouveau mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#E8714D] text-white rounded-lg font-semibold disabled:opacity-50">
                  {loading ? "Mise à jour…" : "Enregistrer"}
                </button>
              </form>
            )}
            <p className="mt-6 text-center text-sm">
              <Link href="/auth/login" className="text-[#E8714D] font-semibold">Retour à la connexion</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
