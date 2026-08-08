"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type MaterialOption = { id: string; name: string }

type Row = {
  id: string
  pickupCity: string
  dropoffCity: string
  quantity: number
  unit: string
  requestedDate: string
  createdAt: string
  status: string
  materialDescription: string | null
  material: { id: string; name: string } | null
  customer: {
    id: string
    user: { id: string; firstName: string | null; lastName: string | null; phone: string; email: string }
  } | null
  _count: { quotes: number }
  missions: Array<{
    id: string
    status: string
    trucker: { id: string; user: { id: string; firstName: string | null; lastName: string | null; phone: string } } | null
  }>
}

type ListResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: Row[]
  filters: { materials: MaterialOption[] }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-700 border-gray-200"
    case "PENDING_PAYMENT":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "PUBLISHED":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "MATCHED":
    case "IN_NEGOTIATION":
    case "ASSIGNED":
    case "IN_PROGRESS":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "COMPLETED":
      return "bg-green-50 text-green-700 border-green-200"
    case "CANCELLED":
      return "bg-red-50 text-red-700 border-red-200"
    case "DISPUTED":
      return "bg-rose-50 text-rose-700 border-rose-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

function formatName(u: { firstName: string | null; lastName: string | null } | null | undefined) {
  const fn = u?.firstName?.trim() || ""
  const ln = u?.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

export default function AdminAnnoncesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createCustomerId, setCreateCustomerId] = useState("")
  const [createPickupCity, setCreatePickupCity] = useState("")
  const [createDropoffCity, setCreateDropoffCity] = useState("")
  const [createQuantity, setCreateQuantity] = useState<number>(1)
  const [createUnit, setCreateUnit] = useState("TONNES")
  const [createRequestedDate, setCreateRequestedDate] = useState("")

  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [materialId, setMaterialId] = useState("")
  const [hasQuotes, setHasQuotes] = useState<"" | "true" | "false">("")
  const [hasAssigned, setHasAssigned] = useState<"" | "true" | "false">("")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [sort, setSort] = useState("createdAt_desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const statusOptions = useMemo(
    () => [
      "DRAFT",
      "PENDING_PAYMENT",
      "PUBLISHED",
      "MATCHED",
      "IN_NEGOTIATION",
      "ASSIGNED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "DISPUTED",
    ],
    []
  )

  const load = async () => {
    setLoading(true)
    setError(null)

    const res = await apiClient.adminListAnnonces({
      page,
      pageSize,
      q: q.trim() || undefined,
      status: status || undefined,
      materialId: materialId || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      hasQuotes: hasQuotes === "" ? undefined : hasQuotes === "true",
      hasAssigned: hasAssigned === "" ? undefined : hasAssigned === "true",
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
    setMaterialId("")
    setHasQuotes("")
    setHasAssigned("")
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

    const res = await apiClient.adminCreateAnnonce({
      customerId: createCustomerId.trim(),
      pickupCity: createPickupCity.trim(),
      dropoffCity: createDropoffCity.trim(),
      quantity: createQuantity,
      unit: createUnit,
      requestedDate: createRequestedDate || new Date().toISOString(),
      status: "DRAFT",
    })

    if (!res.success) {
      setError(res.error || "Erreur lors de la création")
      setCreating(false)
      return
    }

    setCreateOpen(false)
    setCreateCustomerId("")
    setCreatePickupCity("")
    setCreateDropoffCity("")
    setCreateQuantity(1)
    setCreateUnit("TONNES")
    setCreateRequestedDate("")
    setCreating(false)
    await load()
  }

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Annonces</h1>
          <p className="mt-1 text-sm text-gray-600">Toutes les demandes publiées sur WAGESSE.</p>
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
              <label className="text-xs font-semibold text-gray-600">Customer ID</label>
              <input
                value={createCustomerId}
                onChange={(e) => setCreateCustomerId(e.target.value)}
                placeholder="customerProfileId"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Départ</label>
              <input
                value={createPickupCity}
                onChange={(e) => setCreatePickupCity(e.target.value)}
                placeholder="Ville départ"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Destination</label>
              <input
                value={createDropoffCity}
                onChange={(e) => setCreateDropoffCity(e.target.value)}
                placeholder="Ville destination"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Quantité</label>
              <input
                type="number"
                value={createQuantity}
                onChange={(e) => setCreateQuantity(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-gray-600">Unité</label>
              <select
                value={createUnit}
                onChange={(e) => setCreateUnit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                {[
                  "TONNES",
                  "CUBIC_METERS",
                  "NUMBER_OF_TRIPS",
                  "FULL_TRUCK_LOAD",
                ].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Date souhaitée</label>
              <input
                type="date"
                value={createRequestedDate}
                onChange={(e) => setCreateRequestedDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="md:col-span-12 flex items-center justify-end">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-[#E8714D] text-white text-sm font-semibold hover:bg-[#D65A3A] disabled:opacity-50"
              >
                {creating ? "Création…" : "Créer l’annonce"}
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
              placeholder="ID, nom, téléphone, départ, destination, matériau..."
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
            <label className="text-xs font-semibold text-gray-600">Matériau</label>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              {(data?.filters.materials || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
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
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Avec offres</label>
            <select
              value={hasQuotes}
              onChange={(e) => setHasQuotes(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              <option value="true">Avec offre</option>
              <option value="false">Sans offre</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Assignée</label>
            <select
              value={hasAssigned}
              onChange={(e) => setHasAssigned(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              <option value="true">Avec camionneur</option>
              <option value="false">Sans camionneur</option>
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
              <option value="quotes_desc">Nb offres (desc)</option>
              <option value="quotes_asc">Nb offres (asc)</option>
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
          <p className="text-sm text-gray-700 font-semibold">Aucune annonce</p>
          <p className="mt-1 text-sm text-gray-600">Aucun résultat pour les filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-[1300px] w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Départ</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Matériau</th>
                <th className="px-4 py-3">Quantité</th>
                <th className="px-4 py-3">Date souhaitée</th>
                <th className="px-4 py-3">Créée</th>
                <th className="px-4 py-3">Offres</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Camionneur</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((it) => {
                const clientUser = it.customer?.user
                const assigned = it.missions?.[0]?.trucker?.user
                return (
                  <tr key={it.id} className="text-sm hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{it.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{formatName(clientUser)}</div>
                      <div className="text-xs text-gray-500">{clientUser?.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{clientUser?.phone || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{it.pickupCity}</td>
                    <td className="px-4 py-3 text-gray-700">{it.dropoffCity}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {it.material?.name || it.materialDescription || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(it.requestedDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(it.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center min-w-[28px] rounded-full bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1">
                        {it._count?.quotes ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " +
                          statusBadgeClass(it.status)
                        }
                      >
                        {it.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {assigned ? (
                        <div>
                          <div className="font-semibold text-gray-900">{formatName(assigned)}</div>
                          <div className="text-xs text-gray-500">{assigned.phone}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/annonces/${it.id}`}
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
          Page {data?.page ?? 1} / {data?.totalPages ?? 1} — {data?.total ?? 0} annonces
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
