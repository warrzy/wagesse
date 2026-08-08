"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"

function formatName(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  const fn = u?.firstName?.trim() || ""
  const ln = u?.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

function statusBadgeClass(status: string) {
  const s = (status || "").toUpperCase()
  if (s.includes("SUCCESS") || s === "PAID") return "bg-green-50 text-green-700 border-green-200"
  if (s.includes("FAIL") || s.includes("CANCEL") || s.includes("REJECT")) return "bg-red-50 text-red-700 border-red-200"
  if (s.includes("PENDING") || s.includes("PROCESS") || s.includes("CALCULATED")) return "bg-amber-50 text-amber-700 border-amber-200"
  if (s.includes("REFUND")) return "bg-indigo-50 text-indigo-700 border-indigo-200"
  return "bg-gray-50 text-gray-700 border-gray-200"
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900 break-words">{value ?? "—"}</p>
    </div>
  )
}

export default function AdminTransactionDetailsTypedPage() {
  const params = useParams<{ source: string; id: string }>()
  const source = params.source
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const res = await apiClient.adminGetTransactionDetails(source, id)
      if (!res.success) {
        setError(res.error || "Erreur lors du chargement")
        setLoading(false)
        return
      }

      setData(res.data)
      setLoading(false)
    }

    if (source && id) load()
  }, [source, id])

  const header = useMemo(() => {
    if (!data) return null
    if (data.source === "CreditTransaction") {
      return {
        title: "Transaction crédit",
        status: data.row.amount >= 0 ? "CREDIT" : "DEBIT",
        date: data.row.createdAt,
      }
    }
    if (data.source === "Commission") {
      return {
        title: "Commission",
        status: data.row.status,
        date: data.row.createdAt,
      }
    }
    if (data.source === "Payout") {
      return {
        title: "Payout",
        status: data.row.status,
        date: data.row.requestedAt,
      }
    }
    return null
  }, [data])

  if (loading) {
    return (
      <div className="container-max max-w-6xl">
        <div className="card">
          <p className="text-sm text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-max max-w-6xl">
        <div className="card">
          <p className="text-sm text-red-600 font-semibold">Erreur</p>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <div className="mt-4">
            <Link href="/admin/transactions" className="text-sm font-semibold text-[#E8714D] hover:underline">
              Retour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const row = data?.row

  const user =
    data?.source === "CreditTransaction" ? row?.wallet?.user :
    data?.source === "Commission" ? row?.trucker?.user :
    data?.source === "Payout" ? row?.trucker?.user :
    null

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{header?.title || "Transaction"}</h1>
            {header?.status ? (
              <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + statusBadgeClass(header.status)}>
                {header.status}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-gray-600 font-mono">{data.source}:{row.id}</p>
          {header?.date ? <p className="text-xs text-gray-500">{new Date(header.date).toLocaleString()}</p> : null}
        </div>

        <Link
          href="/admin/transactions"
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Retour
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <p className="text-sm font-semibold">Résumé</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {data.source === "CreditTransaction" ? (
                <>
                  <KV label="Type" value={row.type} />
                  <KV label="Crédits" value={row.amount} />
                  <KV label="Balance après" value={row.balanceAfter} />
                  <KV label="Wallet" value={row.walletId} />
                </>
              ) : null}

              {data.source === "Commission" ? (
                <>
                  <KV label="Montant" value={`${Math.round(row.commissionAmount)} ${row.currency}`} />
                  <KV label="Taux" value={row.commissionRate} />
                  <KV label="Montant mission" value={`${Math.round(row.missionAmount)} ${row.currency}`} />
                  <KV label="Statut" value={row.status} />
                </>
              ) : null}

              {data.source === "Payout" ? (
                <>
                  <KV label="Montant" value={`${Math.round(row.amount)} ${row.currency}`} />
                  <KV label="Méthode" value={row.paymentMethod} />
                  <KV label="Destination" value={row.destination} />
                  <KV label="TransactionId" value={row.transactionId} />
                </>
              ) : null}
            </div>
          </div>

          {data.source === "Commission" && row.mission ? (
            <div className="card">
              <p className="text-sm font-semibold">Mission liée</p>
              <div className="mt-3">
                <Link href={`/admin/transports/${row.mission.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                  {row.mission.missionReference || row.mission.id}
                </Link>
                <p className="mt-1 text-sm text-gray-600">Statut mission: {row.mission.status}</p>
                <p className="text-xs text-gray-500">Annonce: {row.mission.requestId}</p>
              </div>
            </div>
          ) : null}

          <div className="card">
            <p className="text-sm font-semibold">JSON / metadata</p>
            <pre className="mt-3 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto">{JSON.stringify(row.metadata || row, null, 2)}</pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <p className="text-sm font-semibold">Utilisateur</p>
            <div className="mt-4 text-sm">
              <p className="font-semibold text-gray-900">{formatName(user)}</p>
              <p className="text-gray-600">{user?.phone || "—"}</p>
              <p className="text-gray-600">{user?.email || "—"}</p>
              {user?.id ? (
                <div className="mt-4">
                  <Link href={`/admin/utilisateurs/${user.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                    Voir utilisateur
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Actions admin</p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled
                className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm font-semibold cursor-not-allowed"
              >
                Action (à venir)
              </button>
              <p className="text-xs text-gray-500">
                Les actions sensibles seront activées après mise en place de l'audit log.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
