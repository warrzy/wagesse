"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"

function formatName(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  const fn = u?.firstName?.trim() || ""
  const ln = u?.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

function txTypeBadgeClass(type: string) {
  switch (type) {
    case "PURCHASE":
      return "bg-green-50 text-green-700 border-green-200"
    case "UNLOCK_CONTACT":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "SUBSCRIPTION_MONTHLY_TOPUP":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "ADMIN_ADJUSTMENT":
      return "bg-gray-50 text-gray-700 border-gray-200"
    case "PROMO":
      return "bg-blue-50 text-blue-700 border-blue-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

function AdjustCredits({ walletId, onDone }: { walletId: string; onDone: () => Promise<void> }) {
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now())))

  const submit = async () => {
    setBusy(true)
    setMessage(null)
    const res = await apiClient.adminAdjustWallet(walletId, {
      amount: Number(amount),
      reason,
      idempotencyKey,
    })
    setBusy(false)
    if (!res.success) {
      setMessage(res.error || "Ajustement refusé")
      return
    }
    setMessage("Ajustement enregistré")
    await onDone()
  }

  return (
    <div className="card">
      <p className="text-sm font-semibold">Ajuster les crédits achetés</p>
      <div className="mt-4 space-y-2">
        <input className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant (+ ou -)" />
        <textarea className="input-field min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Justification" />
        <button type="button" disabled={busy} onClick={submit} className="w-full px-4 py-2 rounded-lg bg-[#E8714D] text-white text-sm font-semibold disabled:opacity-50">
          Enregistrer l'ajustement
        </button>
        {message ? <p className="text-xs text-gray-600">{message}</p> : null}
      </div>
    </div>
  )
}

export default function AdminWalletDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    setError(null)

    const res = await apiClient.adminGetWallet(id)
    if (!res.success) {
      setError(res.error || "Erreur lors du chargement")
      setLoading(false)
      return
    }

    setData(res.data)
    setLoading(false)
  }

  useEffect(() => {
    if (id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
            <Link href="/admin/wallet" className="text-sm font-semibold text-[#E8714D] hover:underline">
              Retour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const u = data.user

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
          <p className="mt-1 text-sm text-gray-600 font-mono">{data.id}</p>
        </div>

        <Link
          href="/admin/wallet"
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Retour
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <p className="text-sm font-semibold">Balances</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-semibold text-gray-900">{data.balance}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Purchased</p>
                <p className="font-semibold text-gray-900">{data.purchasedBalance}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Subscription</p>
                <p className="font-semibold text-gray-900">{data.subscriptionBalance}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expiry subscription</p>
                <p className="font-semibold text-gray-900">
                  {data.subscriptionBalanceExpiresAt ? new Date(data.subscriptionBalanceExpiresAt).toLocaleString() : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Transactions (100 dernières)</p>
              <Link href={`/admin/transactions?category=CREDIT&source=CreditTransaction&q=${encodeURIComponent(data.userId)}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                Voir dans Transactions
              </Link>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Montant</th>
                    <th className="px-4 py-3">Balance après</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data.transactions || []).map((t: any) => (
                    <tr key={t.id} className="text-sm hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + txTypeBadgeClass(t.type)}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className={t.amount >= 0 ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                          {t.amount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{t.balanceAfter}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">{t.id}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/transactions/CreditTransaction/${t.id}`}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <p className="text-sm font-semibold">Utilisateur</p>
            <div className="mt-4 text-sm">
              <p className="font-semibold text-gray-900">{formatName(u)}</p>
              <p className="text-gray-600">{u.phone}</p>
              <p className="text-gray-600">{u.email}</p>
              <p className="text-xs text-gray-500 font-mono">{u.id}</p>
              <div className="mt-4">
                <Link href={`/admin/utilisateurs/${u.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                  Voir utilisateur
                </Link>
              </div>
            </div>
          </div>

          <AdjustCredits walletId={id} onDone={load} />

          <div className="card">
            <p className="text-sm font-semibold">JSON wallet</p>
            <pre className="mt-3 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
