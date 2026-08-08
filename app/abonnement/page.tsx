"use client"

import { useEffect, useMemo, useState } from "react"
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
}

type Subscription = {
  id: string
  status: string
  startDate: string
  nextPaymentDate: string | null
  plan: Plan
}

function formatPrice(x: number) {
  return x.toLocaleString("fr-FR")
}

export default function AbonnementPage() {
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<Plan[]>([])
  const [current, setCurrent] = useState<Subscription | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentCode = current?.plan?.code

  useEffect(() => {
    const load = async () => {
      const p = await apiClient.getSubscriptionPlans()
      if (p.success) {
        setPlans((p.data as Plan[]) || [])
      } else {
        setError(p.error || "Erreur lors du chargement des plans")
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) {
        const c = await apiClient.getCurrentSubscription()
        if (c.success) setCurrent((c.data as any) || null)
      }

      setLoading(false)
    }
    load()
  }, [])

  const sorted = useMemo(() => {
    return [...plans].sort((a, b) => (Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)) || a.monthlyPrice - b.monthlyPrice)
  }, [plans])

  const activate = async (code: string | null) => {
    if (!code) {
      setError("Ce plan ne peut pas être activé car il n'a pas de code.")
      return
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      window.location.href = "/auth/login"
      return
    }

    setSubmitting(code)
    setError(null)
    const res = await apiClient.activateSubscription(code)
    if (!res.success) {
      setError(res.error || "Erreur")
      setSubmitting(null)
      return
    }
    const c = await apiClient.getCurrentSubscription()
    if (c.success) setCurrent((c.data as any) || null)
    setSubmitting(null)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F8FAFC] pt-10 pb-16">
        <div className="container-max">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#0F172A]">Abonnement</h1>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Choisis un plan pour obtenir des crédits mensuels et plus de visibilité. La publication et la consultation restent gratuites.
            </p>
          </div>

          {error ? (
            <div className="mt-8 max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          ) : null}

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              <div className="card">Chargement…</div>
            ) : (
              sorted.map((p) => {
                const active = Boolean(p.code) && currentCode === p.code && current?.status === "ACTIVE"
                const isPopular = Boolean(p.badge)
                const benefits: string[] = Array.isArray(p.benefits) ? p.benefits : []

                return (
                  <div
                    key={p.id || p.code || p.name}
                    className={
                      "rounded-2xl border bg-white p-6 shadow-sm transition-all " +
                      (isPopular ? "border-[#F97316] shadow-lg" : "border-gray-200")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-[#0F172A]">{p.name}</h2>
                      {isPopular ? (
                        <span className="inline-flex items-center rounded-full bg-[#F97316]/10 text-[#9A3412] px-3 py-1 text-xs font-semibold">
                          {String(p.badge || "Le plus populaire")}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-5 text-3xl font-extrabold tracking-tight text-[#0F172A]">
                      {formatPrice(p.monthlyPrice)} <span className="text-base font-semibold text-gray-600">{p.currency}/mois</span>
                    </p>

                    <div className="mt-5 space-y-2 text-sm text-gray-700">
                      <p className="font-semibold">{p.monthlyCredits} crédits/mois</p>
                      <p>Boosts: {p.monthlyBoosts}/mois</p>
                      <p>Coût déblocage: {p.unlockCostCredits} crédit{p.unlockCostCredits > 1 ? "s" : ""}</p>
                      <p className="text-gray-500">Cycle: {p.cycleDays} jours</p>
                    </div>

                    <ul className="mt-5 space-y-2 text-sm text-gray-700">
                      {benefits.slice(0, 6).map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>

                    <div className="mt-6">
                      {active ? (
                        <div className="w-full rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                          Plan actuel
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => activate(p.code)}
                          disabled={submitting !== null || !p.code}
                          className={
                            "w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50 " +
                            (isPopular
                              ? "bg-[#F97316] text-white hover:bg-[#EA580C]"
                              : "border border-gray-200 bg-white text-[#0F172A] hover:bg-[#F8FAFC]")
                          }
                        >
                          {submitting === p.code ? "Activation…" : !p.code ? "Non activable" : "Activer"}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {current ? (
            <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#0F172A]">Votre abonnement</h3>
              <div className="mt-3 text-sm text-gray-700">
                <p>
                  Plan: <span className="font-semibold">{current.plan?.code}</span>
                </p>
                <p>
                  Statut: <span className="font-semibold">{current.status}</span>
                </p>
                {current.nextPaymentDate ? (
                  <p>
                    Prochain renouvellement: <span className="font-semibold">{new Date(current.nextPaymentDate).toLocaleDateString("fr-FR")}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  )
}
