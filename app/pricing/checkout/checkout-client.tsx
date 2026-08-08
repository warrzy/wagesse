"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"

type Pack = {
  id?: string
  code: string
  title: string
  priceXof: number
  credits: number
  badge?: string | null
}

export default function CheckoutClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const packCode = searchParams.get("pack") || ""
  const [loading, setLoading] = useState(true)
  const [pack, setPack] = useState<Pack | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [method, setMethod] = useState<"orange_money" | "mobile_money" | "card">("orange_money")
  const [submitting, setSubmitting] = useState(false)

  const unitPrice = useMemo(() => {
    if (!pack) return null
    return Math.round(pack.priceXof / pack.credits)
  }, [pack])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
      return
    }

    const load = async () => {
      const res = await apiClient.getCreditPacks()
      if (!res.success) {
        setError(res.error || "Impossible de charger les packs")
        setLoading(false)
        return
      }

      const packs = (res.data as Pack[]) || []
      const found = packs.find((p) => p.code === packCode)
      if (!found) {
        setError("Pack introuvable")
        setLoading(false)
        return
      }

      setPack(found)
      setLoading(false)
    }

    load()
  }, [router, packCode])

  const handlePay = async () => {
    if (!pack) return
    setSubmitting(true)
    setError(null)

    const res = await apiClient.purchaseCredits(
      {
        packCode: pack.code,
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

  if (!pack) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 pt-10 pb-16">
          <div className="container-max max-w-xl">
            <p className="text-sm text-red-600">{error || "Pack introuvable"}</p>
            <div className="mt-4">
              <Link href="/pricing" className="text-sm font-semibold text-[#E8714D] hover:underline">
                Retour aux tarifs
              </Link>
            </div>
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
        <div className="container-max max-w-3xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h1 className="text-2xl font-bold">Acheter des crédits</h1>
              <p className="mt-2 text-sm text-gray-600">Vous ne payez que pour débloquer un contact.</p>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-[#F8FAFC] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{pack.title}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {pack.credits} crédit{pack.credits > 1 ? "s" : ""}
                    </p>
                  </div>
                  {pack.badge ? (
                    <span className="inline-flex items-center rounded-full bg-[#F97316]/10 text-[#9A3412] px-3 py-1 text-xs font-semibold">
                      {pack.badge}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <p className="text-3xl font-extrabold tracking-tight text-[#0F172A]">
                    {pack.priceXof.toLocaleString("fr-FR")} <span className="text-base font-semibold text-gray-600">FCFA</span>
                  </p>
                  {unitPrice !== null ? (
                    <p className="text-xs text-gray-500">{unitPrice.toLocaleString("fr-FR")} FCFA/contact</p>
                  ) : null}
                </div>
              </div>

              {error ? (
                <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{error}</div>
              ) : null}

              <div className="mt-6">
                <label className="text-sm font-medium mb-1 block">Méthode de paiement</label>
                <select className="input-field" value={method} onChange={(e) => setMethod(e.target.value as any)}>
                  <option value="orange_money">Orange Money</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="card">Carte</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium mb-1 block">Numéro Mobile Money (optionnel)</label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ex: 70xxxxxx"
                  className="input-field"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <Link
                  href="/pricing"
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                >
                  Retour
                </Link>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-[#F97316] text-white px-5 py-3 text-sm font-semibold hover:bg-[#EA580C] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Initialisation…" : "Payer"}
                </button>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-[#0F172A]">Comment ça marche</h2>
              <div className="mt-4 space-y-3 text-sm text-gray-700">
                <p>1 crédit = 1 contact débloqué</p>
                <p>Celui qui initie le contact paie</p>
                <p>Un contact déjà débloqué n’est jamais facturé deux fois</p>
              </div>

              <div className="mt-6 rounded-xl border border-gray-200 bg-[#F8FAFC] p-4 text-sm text-gray-700">
                <p className="font-semibold">Important</p>
                <p className="mt-2">Le portefeuille est crédité uniquement après confirmation côté serveur.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
