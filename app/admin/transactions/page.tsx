"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type UnifiedRow = {
  date: string
  id: string
  reference: string
  user: { id: string; firstName: string | null; lastName: string | null; phone: string; email: string; role: string; status: string } | null
  category: "CREDIT" | "COMMISSION" | "PAYOUT"
  subtype: string
  amountXof: number
  credits: number | null
  status: string
  linkedObject: { kind: string; id: string; label?: string | null } | null
  source: "CreditTransaction" | "Commission" | "Payout"
  sourceId: string
}

type ListResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: UnifiedRow[]
}

function formatName(u: { firstName: string | null; lastName: string | null } | null | undefined) {
  const fn = u?.firstName?.trim() || ""
  const ln = u?.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

function categoryBadgeClass(category: string) {
  switch (category) {
    case "CREDIT":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "COMMISSION":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "PAYOUT":
      return "bg-amber-50 text-amber-700 border-amber-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

function statusBadgeClass(status: string) {
  const s = (status || "").toUpperCase()
  if (s.includes("SUCCESS") || s === "PAID") return "bg-green-50 text-green-700 border-green-200"
  if (s.includes("FAIL") || s.includes("CANCEL") || s.includes("REJECT")) return "bg-red-50 text-red-700 border-red-200"
  if (s.includes("PENDING") || s.includes("PROCESS") || s.includes("CALCULATED")) return "bg-amber-50 text-amber-700 border-amber-200"
  if (s.includes("REFUND")) return "bg-indigo-50 text-indigo-700 border-indigo-200"
  return "bg-gray-50 text-gray-700 border-gray-200"
}

export default function AdminTransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)

  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")
  const [source, setSource] = useState("")
  const [subtype, setSubtype] = useState("")
  const [status, setStatus] = useState("")
  const [userId, setUserId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [amountMin, setAmountMin] = useState("")
  const [amountMax, setAmountMax] = useState("")
  const [creditsMin, setCreditsMin] = useState("")
  const [creditsMax, setCreditsMax] = useState("")
  const [sort, setSort] = useState("date_desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const categoryOptions = useMemo(() => ["CREDIT", "COMMISSION", "PAYOUT"], [])
  const sourceOptions = useMemo(() => ["CreditTransaction", "Commission", "Payout"], [])

  const creditSubtypeOptions = useMemo(
    () => ["PURCHASE", "UNLOCK_CONTACT", "SUBSCRIPTION_MONTHLY_TOPUP", "ADMIN_ADJUSTMENT", "PROMO"],
    []
  )

  const payoutStatusOptions = useMemo(() => ["PENDING", "PROCESSING", "SUCCESSFUL", "FAILED", "CANCELLED"], [])

  const load = async () => {
    setLoading(true)
    setError(null)

    const res = await apiClient.adminListTransactions({
      page,
      pageSize,
      q: q.trim() || undefined,
      category: category || undefined,
      source: source || undefined,
      subtype: subtype || undefined,
      status: status || undefined,
      userId: userId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      amountMin: amountMin ? Number(amountMin) : undefined,
      amountMax: amountMax ? Number(amountMax) : undefined,
      creditsMin: creditsMin ? Number(creditsMin) : undefined,
      creditsMax: creditsMax ? Number(creditsMax) : undefined,
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
    setCategory("")
    setSource("")
    setSubtype("")
    setStatus("")
    setUserId("")
    setDateFrom("")
    setDateTo("")
    setAmountMin("")
    setAmountMax("")
    setCreditsMin("")
    setCreditsMax("")
    setSort("date_desc")
    setPageSize(20)
    setPage(1)
    await load()
  }

  const inferredSubtypeOptions = useMemo(() => {
    if (category === "CREDIT" || source === "CreditTransaction") return creditSubtypeOptions
    return []
  }, [category, source, creditSubtypeOptions])

  const inferredStatusOptions = useMemo(() => {
    if (category === "PAYOUT" || source === "Payout") return payoutStatusOptions
    return []
  }, [category, source, payoutStatusOptions])

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="mt-1 text-sm text-gray-600">Vue métier unifiée (Crédits, Commissions, Payouts).</p>
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
              placeholder="Référence, ID, téléphone/email, objet lié..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8714D]/40"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Catégorie</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(1)
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Toutes</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Source</label>
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value)
                setPage(1)
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Toutes</option>
              {sourceOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex gap-3 items-end justify-end">
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
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Sous-type</label>
            <input
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              placeholder="ex: PURCHASE / orange_money"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              list="subtype-options"
            />
            <datalist id="subtype-options">
              {inferredSubtypeOptions.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Statut</label>
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="ex: pending / SUCCESSFUL"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              list="status-options"
            />
            <datalist id="status-options">
              {inferredStatusOptions.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Utilisateur (ID)</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User.id"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Tri</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="date_desc">Date (desc)</option>
              <option value="date_asc">Date (asc)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Date du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Montant min (FCFA)</label>
            <input
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Montant max (FCFA)</label>
            <input
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Crédits min</label>
            <input
              value={creditsMin}
              onChange={(e) => setCreditsMin(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Crédits max</label>
            <input
              value={creditsMax}
              onChange={(e) => setCreditsMax(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
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
          <p className="text-sm text-gray-700 font-semibold">Aucune transaction</p>
          <p className="mt-1 text-sm text-gray-600">Aucun résultat pour les filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-[1600px] w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Réf / ID</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Sous-type</th>
                <th className="px-4 py-3">Montant FCFA</th>
                <th className="px-4 py-3">Crédits</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Objet lié</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((it) => (
                <tr key={it.id} className="text-sm hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{new Date(it.date).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{it.reference}</div>
                    <div className="text-xs text-gray-500 font-mono">{it.sourceId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{formatName(it.user)}</div>
                    <div className="text-xs text-gray-500">{it.user?.phone || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + categoryBadgeClass(it.category)}>
                      {it.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it.subtype}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {it.amountXof ? Math.round(it.amountXof) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it.credits ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + statusBadgeClass(it.status)}>
                      {it.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {it.linkedObject ? (
                      it.linkedObject.kind === "Mission" ? (
                        <Link
                          href={`/admin/transports/${it.linkedObject.id}`}
                          className="text-sm font-semibold text-[#E8714D] hover:underline"
                        >
                          {it.linkedObject.label || it.linkedObject.id}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-600">{it.linkedObject.kind}: {it.linkedObject.label || it.linkedObject.id}</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it.source}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/transactions/${it.source}/${it.sourceId}`}
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
          Page {data?.page ?? 1} / {data?.totalPages ?? 1} — {data?.total ?? 0} lignes
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
