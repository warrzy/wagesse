"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type WalletRow = {
  id: string
  userId: string
  balance: number
  purchasedBalance: number
  subscriptionBalance: number
  subscriptionBalanceExpiresAt: string | null
  createdAt: string
  updatedAt: string
  user: { id: string; firstName: string | null; lastName: string | null; phone: string; email: string; role: string; status: string }
  _count: { transactions: number }
}

type ListResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: WalletRow[]
}

function formatName(u: { firstName: string | null; lastName: string | null } | null | undefined) {
  const fn = u?.firstName?.trim() || ""
  const ln = u?.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

export default function AdminWalletPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)

  const [q, setQ] = useState("")
  const [balanceMin, setBalanceMin] = useState("")
  const [balanceMax, setBalanceMax] = useState("")
  const [sort, setSort] = useState("updatedAt_desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const load = async () => {
    setLoading(true)
    setError(null)

    const res = await apiClient.adminListWallets({
      page,
      pageSize,
      q: q.trim() || undefined,
      balanceMin: balanceMin ? Number(balanceMin) : undefined,
      balanceMax: balanceMax ? Number(balanceMax) : undefined,
      sort,
    })

    if (!res.success) {
      setError(res.error || "Erreur lors du chargement")
      setLoading(false)
      return
    }

    setData(res.data as any)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sort])

  const applyFilters = async () => {
    setPage(1)
    await load()
  }

  const resetFilters = async () => {
    setQ("")
    setBalanceMin("")
    setBalanceMax("")
    setSort("updatedAt_desc")
    setPageSize(20)
    setPage(1)
    await load()
  }

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Wallet / Crédits</h1>
          <p className="mt-1 text-sm text-gray-600">Wallets de crédits des utilisateurs.</p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-semibold">{data?.total ?? "—"}</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <label className="text-xs font-semibold text-gray-600">Recherche</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Wallet ID, User ID, téléphone, email, nom..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8714D]/40"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Balance min</label>
            <input
              value={balanceMin}
              onChange={(e) => setBalanceMin(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Balance max</label>
            <input
              value={balanceMax}
              onChange={(e) => setBalanceMax(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>

          <div className="md:col-span-2 flex gap-3 items-end justify-end">
            <button
              type="button"
              onClick={applyFilters}
              className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#0b1220]"
            >
              Appliquer
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-gray-600">Tri</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="updatedAt_desc">MAJ (desc)</option>
              <option value="updatedAt_asc">MAJ (asc)</option>
              <option value="createdAt_desc">Création (desc)</option>
              <option value="createdAt_asc">Création (asc)</option>
              <option value="balance_desc">Balance (desc)</option>
              <option value="balance_asc">Balance (asc)</option>
              <option value="purchasedBalance_desc">Purchased (desc)</option>
              <option value="purchasedBalance_asc">Purchased (asc)</option>
              <option value="subscriptionBalance_desc">Subscription (desc)</option>
              <option value="subscriptionBalance_asc">Subscription (asc)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <p className="text-sm text-gray-600">Chargement...</p>
        </div>
      ) : error ? (
        <div className="card">
          <p className="text-sm text-red-600 font-semibold">Erreur</p>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="card">
          <p className="text-sm text-gray-700 font-semibold">Aucun wallet</p>
          <p className="mt-1 text-sm text-gray-600">Aucun résultat pour les filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-[1400px] w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Balances</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Transactions</th>
                <th className="px-4 py-3">Wallet ID</th>
                <th className="px-4 py-3">MAJ</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((it) => (
                <tr key={it.id} className="text-sm hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{formatName(it.user)}</div>
                    <div className="text-xs text-gray-500">{it.user.phone} • {it.user.email}</div>
                    <div className="text-xs text-gray-500 font-mono">User: {it.userId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">Total: {it.balance}</div>
                    <div className="text-xs text-gray-600">Purchased: {it.purchasedBalance}</div>
                    <div className="text-xs text-gray-600">Subscription: {it.subscriptionBalance}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {it.subscriptionBalanceExpiresAt ? new Date(it.subscriptionBalanceExpiresAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it._count.transactions}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-500 font-mono">{it.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{new Date(it.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/wallet/${it.id}`}
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
      )}

      <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-600">
          Page {data?.page ?? 1} / {data?.totalPages ?? 1} — {data?.total ?? 0} wallets
        </div>

        <div className="flex items-center gap-3">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10))
              setPage(1)
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {[10, 20, 30, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>

          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={!data || data.page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            Précédent
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={!data || data.page >= data.totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  )
}
