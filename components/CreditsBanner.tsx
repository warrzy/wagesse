"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type CreditsBannerProps = {
  dashboardHref: string
  contactsHref: string
}

export default function CreditsBanner({ dashboardHref, contactsHref }: CreditsBannerProps) {
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<number | null>(null)
  const [subscription, setSubscription] = useState<number | null>(null)
  const [purchased, setPurchased] = useState<number | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.getCreditBalance()
      if (res.success) {
        const data = res.data as any
        setBalance(typeof data?.balance === "number" ? data.balance : null)
        setSubscription(typeof data?.subscription === "number" ? data.subscription : null)
        setPurchased(typeof data?.purchased === "number" ? data.purchased : null)
        setExpiresAt(typeof data?.subscriptionExpiresAt === "string" ? data.subscriptionExpiresAt : null)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">Mes crédits</p>
          <p className="mt-1 text-sm text-gray-600">
            Solde: {loading ? "…" : balance === null ? "—" : `${balance} crédit${balance > 1 ? "s" : ""}`}
            <span className="text-gray-400"> • </span>
            1 crédit = 1 contact débloqué
          </p>
          {!loading && (subscription !== null || purchased !== null) ? (
            <p className="mt-1 text-xs text-gray-500">
              Abonnement: {subscription ?? "—"} • Achetés: {purchased ?? "—"}
              {expiresAt ? ` • Expire le ${new Date(expiresAt).toLocaleDateString("fr-FR")}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/pricing" className="text-sm font-semibold text-[#E8714D] hover:underline">
            Acheter des crédits
          </Link>
          <Link href={contactsHref} className="text-sm font-semibold text-[#E8714D] hover:underline">
            Mes contacts
          </Link>
          <Link href={dashboardHref} className="text-sm font-semibold text-gray-700 hover:underline">
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
