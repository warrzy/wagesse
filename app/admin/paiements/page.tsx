"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type Row = {
  id: string
  payer: string
  payerUser: { id: string; firstName: string | null; lastName: string | null; phone: string; email: string; role: string; status: string } | null
  customerId: string | null
  amount: number
  currency: string
  type: string
  description: string | null
  reference: string
  providerName: string
  providerReference: string | null
  status: string
  platformFee: number
  providerFee: number
  missionId: string | null
  initiatedAt: string
  confirmedAt: string | null
  failedAt: string | null
  expiresAt: string | null
  lastAttemptAt: string | null
  customer: { id: string; user: { id: string; firstName: string | null; lastName: string | null; phone: string; email: string } } | null
  mission: { id: string; missionReference: string | null; status: string; requestId: string; createdAt: string } | null
  subscriptionPayment: { id: string; subscriptionId: string; status: string; paidAt: string | null } | null
  _count: { attempts: number; refunds: number }
}

type ListResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: Row[]
}

function formatName(u: { firstName: string | null; lastName: string | null } | null | undefined) {
  const fn = u?.firstName?.trim() || ""
  const ln = u?.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "SUCCESSFUL":
      return "bg-green-50 text-green-700 border-green-200"
    case "FAILED":
    case "CANCELLED":
      return "bg-red-50 text-red-700 border-red-200"
    case "PENDING":
    case "IN_PROGRESS":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "INITIATED":
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

export default function AdminPaiementsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)

  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")
  const [providerName, setProviderName] = useState("")
  const [initiatedFrom, setInitiatedFrom] = useState("")
  const [initiatedTo, setInitiatedTo] = useState("")
  const [sort, setSort] = useState("initiatedAt_desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const statusOptions = useMemo(
    () => [
      "INITIATED",
      "PENDING",
      "IN_PROGRESS",
      "SUCCESSFUL",
      "FAILED",
      "EXPIRED",
      "CANCELLED",
      "PARTIALLY_REFUNDED",
      "REFUNDED",
      "DISPUTED",
    ],
    []
  )

  const typeOptions = useMemo(
    () => [
      "CONTACT_UNLOCK",
      "CREDIT_PURCHASE",
      "MISSION_PAYMENT",
      "SUBSCRIPTION",
      "PLATFORM_FEE",
      "REFUND",
    ],
    []
  )

  const load = async () => {
    setLoading(true)
    setError(null)

    const res = await apiClient.adminListPaiements({
      page,
      pageSize,
      q: q.trim() || undefined,
      status: status || undefined,
      type: type || undefined,
      providerName: providerName || undefined,
      initiatedFrom: initiatedFrom || undefined,
      initiatedTo: initiatedTo || undefined,
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
    setStatus("")
    setType("")
    setProviderName("")
    setInitiatedFrom("")
    setInitiatedTo("")
    setSort("initiatedAt_desc")
    setPageSize(20)
    setPage(1)
    await load()
  }

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Paiements</h1>
          <p className="mt-1 text-sm text-gray-600">Paiements (mission, crédits, abonnements, etc.).</p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-semibold">{data?.total ?? "—"}</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <label className="text-xs font-semibold text-gray-600">Recherche</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ID, référence, providerRef, payerId, téléphone..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8714D]/40"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
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
            <label className="text-xs font-semibold text-gray-600">Provider</label>
            <input
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder='ex: "orange_money"'
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Du</label>
            <input
              type="date"
              value={initiatedFrom}
              onChange={(e) => setInitiatedFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Au</label>
            <input
              type="date"
              value={initiatedTo}
              onChange={(e) => setInitiatedTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Tri</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="initiatedAt_desc">Initié (desc)</option>
              <option value="initiatedAt_asc">Initié (asc)</option>
              <option value="confirmedAt_desc">Confirmé (desc)</option>
              <option value="confirmedAt_asc">Confirmé (asc)</option>
              <option value="amount_desc">Montant (desc)</option>
              <option value="amount_asc">Montant (asc)</option>
              <option value="status_asc">Statut (A-Z)</option>
              <option value="status_desc">Statut (Z-A)</option>
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
          <p className="text-sm text-gray-700 font-semibold">Aucun paiement</p>
          <p className="mt-1 text-sm text-gray-600">Aucun résultat pour les filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-[1600px] w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Payer</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Mission</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Refunds</th>
                <th className="px-4 py-3">Initié</th>
                <th className="px-4 py-3">Confirmé</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((it) => (
                <tr key={it.id} className="text-sm hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{it.reference}</div>
                    <div className="text-xs text-gray-500 font-mono">{it.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{Math.round(it.amount)} {it.currency}</div>
                    <div className="text-xs text-gray-500">Frais: {Math.round(it.platformFee)} + {Math.round(it.providerFee)}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it.type}</td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + statusBadgeClass(it.status)}>
                      {it.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{it.providerName}</div>
                    <div className="text-xs text-gray-500">{it.providerReference || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{formatName(it.payerUser)}</div>
                    <div className="text-xs text-gray-500">{it.payerUser?.phone || it.payer}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{formatName(it.customer?.user)}</div>
                    <div className="text-xs text-gray-500">{it.customer?.user?.phone || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {it.mission ? (
                      <Link href={`/admin/transports/${it.mission.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                        {it.mission.missionReference || it.mission.id}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                    {it.mission?.requestId ? (
                      <div className="text-xs text-gray-500">Annonce: {it.mission.requestId}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it._count.attempts}</td>
                  <td className="px-4 py-3 text-gray-700">{it._count.refunds}</td>
                  <td className="px-4 py-3 text-gray-700">{new Date(it.initiatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {it.confirmedAt ? new Date(it.confirmedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/paiements/${it.id}`}
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
          Page {data?.page ?? 1} / {data?.totalPages ?? 1} — {data?.total ?? 0} paiements
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
