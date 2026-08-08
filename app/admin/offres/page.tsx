"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type Row = {
  id: string
  requestId: string
  createdAt: string
  status: string
  totalPrice: number
  currencyCode: string
  proposedDate: string
  vehicle: { id: string; licensePlate: string; capacityTonnes: number; isOperational: boolean } | null
  request: {
    id: string
    pickupCity: string
    dropoffCity: string
    customer: {
      id: string
      user: { id: string; firstName: string | null; lastName: string | null; phone: string; email: string }
    } | null
  }
  trucker: {
    id: string
    user: { id: string; firstName: string | null; lastName: string | null; phone: string; email: string }
  } | null
  missions: Array<{ id: string; status: string; createdAt: string; missionReference: string | null }>
}

type TruckerOption = { id: string; user: { firstName: string | null; lastName: string | null; phone: string } }

type ListResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: Row[]
  filters: { truckers: TruckerOption[] }
}

function formatName(u: { firstName: string | null; lastName: string | null } | null | undefined) {
  const fn = u?.firstName?.trim() || ""
  const ln = u?.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "ACCEPTED":
      return "bg-green-50 text-green-700 border-green-200"
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200"
    case "WITHDRAWN":
      return "bg-gray-100 text-gray-700 border-gray-200"
    case "COUNTER_OFFER":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "EXPIRED":
      return "bg-gray-50 text-gray-700 border-gray-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

export default function AdminOffresPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createRequestId, setCreateRequestId] = useState("")
  const [createTruckerId, setCreateTruckerId] = useState("")
  const [createTotalPrice, setCreateTotalPrice] = useState<number>(0)
  const [createProposedDate, setCreateProposedDate] = useState("")
  const [createValidUntil, setCreateValidUntil] = useState("")

  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [truckerId, setTruckerId] = useState("")
  const [accepted, setAccepted] = useState<"" | "true" | "false">("")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [sort, setSort] = useState("createdAt_desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const statusOptions = useMemo(
    () => ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN", "COUNTER_OFFER", "EXPIRED"],
    []
  )

  const load = async () => {
    setLoading(true)
    setError(null)

    const res = await apiClient.adminListOffres({
      page,
      pageSize,
      q: q.trim() || undefined,
      status: status || undefined,
      truckerId: truckerId || undefined,
      accepted: accepted === "" ? undefined : accepted === "true",
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
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
    setTruckerId("")
    setAccepted("")
    setCreatedFrom("")
    setCreatedTo("")
    setSort("createdAt_desc")
    setPageSize(20)
    setPage(1)
    await load()
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreating(true)

    const res = await apiClient.adminCreateOffre({
      requestId: createRequestId.trim(),
      truckerId: createTruckerId.trim(),
      totalPrice: createTotalPrice,
      proposedDate: createProposedDate ? new Date(createProposedDate).toISOString() : new Date().toISOString(),
      validUntil: createValidUntil
        ? new Date(createValidUntil).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "PENDING",
    })

    if (!res.success) {
      setError(res.error || "Erreur lors de la création")
      setCreating(false)
      return
    }

    setCreateOpen(false)
    setCreateRequestId("")
    setCreateTruckerId("")
    setCreateTotalPrice(0)
    setCreateProposedDate("")
    setCreateValidUntil("")
    setCreating(false)
    await load()
  }

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Offres</h1>
          <p className="mt-1 text-sm text-gray-600">Toutes les offres déposées par les camionneurs.</p>
        </div>

        <div className="flex items-end gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-semibold">{data?.total ?? "—"}</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen((v) => !v)}
            className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#0b1220]"
          >
            {createOpen ? "Fermer" : "Créer"}
          </button>
        </div>
      </div>

      {createOpen ? (
        <div className="card mb-6">
          <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Annonce ID</label>
              <input
                value={createRequestId}
                onChange={(e) => setCreateRequestId(e.target.value)}
                placeholder="requestId"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Trucker ID</label>
              <input
                value={createTruckerId}
                onChange={(e) => setCreateTruckerId(e.target.value)}
                placeholder="truckerProfileId"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Prix total</label>
              <input
                type="number"
                value={createTotalPrice}
                onChange={(e) => setCreateTotalPrice(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Date proposée</label>
              <input
                type="date"
                value={createProposedDate}
                onChange={(e) => setCreateProposedDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Valide jusqu’au</label>
              <input
                type="date"
                value={createValidUntil}
                onChange={(e) => setCreateValidUntil(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="md:col-span-12 flex items-center justify-end">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-[#E8714D] text-white text-sm font-semibold hover:bg-[#D65A3A] disabled:opacity-50"
              >
                {creating ? "Création…" : "Créer l’offre"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <label className="text-xs font-semibold text-gray-600">Recherche</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ID offre, ID annonce, nom, téléphone, email..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8714D]/40"
            />
          </div>

          <div className="md:col-span-2">
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
            <label className="text-xs font-semibold text-gray-600">Acceptée</label>
            <select
              value={accepted}
              onChange={(e) => setAccepted(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              <option value="true">Acceptée</option>
              <option value="false">Non acceptée</option>
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
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-gray-600">Camionneur</label>
            <select
              value={truckerId}
              onChange={(e) => setTruckerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              {(data?.filters.truckers || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {formatName(t.user)} — {t.user.phone}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Créée du</label>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Au</label>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
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
              <option value="createdAt_desc">Plus récentes</option>
              <option value="createdAt_asc">Plus anciennes</option>
              <option value="price_desc">Prix (desc)</option>
              <option value="price_asc">Prix (asc)</option>
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
          <p className="text-sm text-gray-700 font-semibold">Aucune offre</p>
          <p className="mt-1 text-sm text-gray-600">Aucun résultat pour les filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-[1400px] w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Annonce</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Camionneur</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Véhicule</th>
                <th className="px-4 py-3">Prix</th>
                <th className="px-4 py-3">Créée</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Acceptée</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((it) => {
                const client = it.request?.customer?.user
                const trucker = it.trucker?.user
                const isAccepted = it.status === "ACCEPTED"
                return (
                  <tr key={it.id} className="text-sm hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{it.id}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/annonces/${it.requestId}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                        {it.requestId}
                      </Link>
                      <div className="text-xs text-gray-500">{it.request?.pickupCity} → {it.request?.dropoffCity}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{formatName(client)}</div>
                      <div className="text-xs text-gray-500">{client?.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{formatName(trucker)}</div>
                      <div className="text-xs text-gray-500">{trucker?.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{trucker?.phone || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {it.vehicle?.licensePlate || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{Math.round(it.totalPrice)} {it.currencyCode}</div>
                      <div className="text-xs text-gray-500">Proposé: {new Date(it.proposedDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{new Date(it.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + statusBadgeClass(it.status)}>
                        {it.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isAccepted ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-1 text-xs font-semibold">
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 text-xs font-semibold">
                          Non
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/offres/${it.id}`}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Voir
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-600">
          Page {data?.page ?? 1} / {data?.totalPages ?? 1} — {data?.total ?? 0} offres
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
