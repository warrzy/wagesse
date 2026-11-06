"use client"

import { FormEvent, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"
import { getDashboardRouteByRole } from "@/lib/role-routing"

function VerifyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [phone, setPhone] = useState(params.get("phone") || "")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const res = await apiClient.verifyOTP(phone, code)
    setLoading(false)
    if (!res.success) {
      setError(res.error || "Code refusé")
      return
    }
    const role = apiClient.getUser()?.role
    router.push(getDashboardRouteByRole(role))
  }

  const resend = async () => {
    setError(null)
    const res = await apiClient.resendOTP(phone)
    if (!res.success) {
      setError(res.error || "Renvoi impossible")
      return
    }
    setInfo("Si le numéro est connu, un nouveau code a été préparé.")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] to-white pt-20 pb-12">
      <div className="container-max max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2 text-center">Vérifier le numéro</h1>
          <p className="text-gray-600 text-center mb-8">
            Saisissez le code reçu pour débloquer les achats et les contacts.
          </p>
          {error ? <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div> : null}
          {info ? <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{info}</div> : null}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Téléphone</label>
              <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Code à 6 chiffres</label>
              <input className="input-field" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#E8714D] text-white font-semibold py-3 disabled:opacity-50">
              {loading ? "Vérification…" : "Valider"}
            </button>
          </form>
          <button type="button" onClick={resend} className="mt-4 w-full text-sm font-semibold text-[#E8714D]">
            Renvoyer un code
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<main className="min-h-screen" />}>
        <VerifyForm />
      </Suspense>
      <Footer />
    </>
  )
}
