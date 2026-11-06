"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"

type Plan = {
  id?: string
  code: string | null
  name: string
  monthlyPrice: number
  currency: string
  monthlyCredits: number
  unlockCostCredits: number
  monthlyBoosts: number
  cycleDays: number
  sortOrder?: number
  badge?: string | null
  benefits?: any
  features?: any
}

export default function CheckoutSubscriptionClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planCode = searchParams.get("plan") || ""

  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [method, setMethod] = useState<"orange_money" | "mobile_money" | "card" | "paydunya">("orange_money")
  const [paymentMode, setPaymentMode] = useState<"MANUAL" | "PAYDUNYA" | "PROVIDER">("MANUAL")
  const [instructions, setInstructions] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const benefits: string[] = useMemo(() => {
    if (!plan) return []
    return Array.isArray(plan.benefits) ? (plan.benefits as any[]).map((x) => String(x)) : []
  }, [plan])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
      return
    }

    const load = async () => {
      if (!planCode) {
        setError("Plan manquant")
        setLoading(false)
        return
      }

      const modeRes = await apiClient.getPaymentMode()
      if (modeRes.success && modeRes.data) {
        setPaymentMode(modeRes.data.mode)
        setInstructions(modeRes.data.instructions)
        if (modeRes.data.mode === "PAYDUNYA") setMethod("paydunya")
      }

      const res = await apiClient.getSubscriptionPlans()
      if (!res.success) {
        setError(res.error || "Impossible de charger les plans")
        setLoading(false)
        return
      }

      const plans = (res.data as Plan[]) || []
      const found = plans.find((p) => p.code === planCode)
      if (!found) {
        setError("Plan introuvable")
        setLoading(false)
        return
      }

      if (!found.code) {
        setError("Ce plan ne peut pas être payé (code manquant).")
        setLoading(false)
        return
      }

      setPlan(found)
      setLoading(false)
    }

    load()
  }, [router, planCode])

  const handlePay = async () => {
    if (!plan?.code) return

    setSubmitting(true)
    setError(null)

    const res = await apiClient.purchaseSubscription(
      {
        planCode: plan.code,
        phoneNumber: phoneNumber || undefined,
        paymentMethod: method,
      },
      "/pricing?success=1"
    )

    if (!res.success) {
      setError(res.error || "Erreur lors de l'initialisation du paiement")
      setSubmitting(false)
      return
    }

    const redirectUrl = (res.data as any)?.redirectUrl
    if (redirectUrl) {
      router.push(redirectUrl)
      return
    }

    setError("Impossible de démarrer le paiement")
    setSubmitting(false)
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 pt-10 pb-16">
          <div className="container-max max-w-xl">
            <p className="text-sm text-gray-500">Chargement…</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-10 pb-16">
        <div className="container-max max-w-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Paiement abonnement</h1>
              <p className="mt-1 text-sm text-gray-600">Finalisez votre souscription</p>
            </div>
            <Link
              href="/pricing"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              Retour
            </Link>
          </div>

          {error ? (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          ) : null}

          {plan ? (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#0F172A]">{plan.name}</h2>
                {plan.badge ? (
                  <span className="inline-flex items-center rounded-full bg-[#F97316]/10 text-[#9A3412] px-3 py-1 text-xs font-semibold">
                    {plan.badge}
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-3xl font-extrabold tracking-tight text-[#0F172A]">
                {Number(plan.monthlyPrice).toLocaleString("fr-FR")} <span className="text-base font-semibold text-gray-600">{plan.currency}/mois</span>
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-4">
                  <p className="font-semibold">{plan.monthlyCredits} crédits/mois</p>
                  <p className="mt-1">Boosts: {plan.monthlyBoosts}/mois</p>
                  <p className="mt-1">Cycle: {plan.cycleDays} jours</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-4">
                  <p className="font-semibold">Paiement</p>
                  <p className="mt-1">
                    Méthode:{" "}
                    {paymentMode === "MANUAL"
                      ? "Règlement hors plateforme"
                      : paymentMode === "PAYDUNYA"
                        ? "PayDunya"
                        : method === "orange_money"
                          ? "Orange Money"
                          : method === "mobile_money"
                            ? "Mobile Money"
                            : "Carte"}
                  </p>
                </div>
              </div>

              {benefits.length ? (
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {benefits.slice(0, 8).map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              ) : null}

              {paymentMode === "MANUAL" ? (
                <div className="mt-6 rounded-xl border border-gray-200 bg-[#F8FAFC] p-4 text-sm text-gray-700">
                  <p className="font-semibold">Règlement hors plateforme</p>
                  <p className="mt-2">{instructions}</p>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="text-xs text-gray-500">Méthode</label>
                    <select className="input-field" value={method} onChange={(e) => setMethod(e.target.value as any)}>
                      {paymentMode === "PAYDUNYA" ? <option value="paydunya">PayDunya</option> : null}
                      {paymentMode === "PROVIDER" ? (
                        <>
                          <option value="orange_money">Orange Money</option>
                          <option value="mobile_money">Mobile Money</option>
                          <option value="card">Carte</option>
                        </>
                      ) : null}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-500">Téléphone (optionnel)</label>
                    <input className="input-field" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Ex: 70 00 00 00" />
                  </div>
                </div>
              )}

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-[#F97316] text-white px-5 py-3 text-sm font-semibold hover:bg-[#EA580C] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Enregistrement…" : paymentMode === "MANUAL" ? "Confirmer la demande" : "Payer et activer"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  )
}
