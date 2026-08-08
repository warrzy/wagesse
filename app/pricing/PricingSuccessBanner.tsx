"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

export default function PricingSuccessBanner() {
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.getCreditBalance()
      if (res.success) {
        const data = res.data as any
        setBalance(typeof data?.balance === "number" ? data.balance : null)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="font-semibold">Paiement confirmé. Vos crédits ont été ajoutés.</p>
          <p className="mt-1 text-green-700">
            Solde actuel: {loading ? "…" : balance === null ? "—" : `${balance} crédit${balance > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/client/contacts" className="font-semibold underline">
            Mes contacts
          </Link>
          <Link href="/dashboard/client" className="font-semibold underline">
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
