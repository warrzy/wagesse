"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type Row = {
  id: string
  userId: string
  truckerType: string
  city: string
  verificationStatus: string
  isAvailable: boolean
  averageRating: number
  totalRatings: number
  totalMissions: number
  acceptanceRate: number
  cancellationRate: number
  organizationId: string | null
  createdAt: string
  user: { id: string; firstName: string | null; lastName: string | null; phone: string; email: string; status: string; role: string; createdAt: string; lastLoginAt: string | null }
  organization: { id: string; name: string; city: string } | null
  vehicles: Array<{ id: string; licensePlate: string; vehicleType: string; capacityTonnes: number; isOperational: boolean }>
  _count: { vehicles: number; documents: number; missions: number; quotes: number; disputes: number; ratings: number }
}

type OrgOption = { id: string; name: string; city: string }

type ListResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: Row[]
  filters: { organizations: OrgOption[] }
}

function formatName(u: { firstName: string | null; lastName: string | null } | null | undefined) {
  const fn = u?.firstName?.trim() || ""
  const ln = u?.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

function verificationBadgeClass(status: string) {
  switch (status) {
    case "VERIFIED":
      return "bg-green-50 text-green-700 border-green-200"
    case "UNDER_REVIEW":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200"
    case "EXPIRED":
      return "bg-gray-100 text-gray-700 border-gray-200"
    case "PENDING":
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

export default function AdminCamionneursPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createEmail, setCreateEmail] = useState("")
  const [createPhone, setCreatePhone] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createFirstName, setCreateFirstName] = useState("")
  const [createLastName, setCreateLastName] = useState("")
  const [createCity, setCreateCity] = useState("")
  const [createTruckerType, setCreateTruckerType] = useState("INDEPENDENT_DRIVER")
  const [createOrganizationId, setCreateOrganizationId] = useState("")

  const [q, setQ] = useState("")
  const [truckerType, setTruckerType] = useState("")
  const [verificationStatus, setVerificationStatus] = useState("")
  const [isAvailable, setIsAvailable] = useState<"" | "true" | "false">("")
  const [organizationId, setOrganizationId] = useState("")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [sort, setSort] = useState("createdAt_desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const truckerTypeOptions = useMemo(() => ["INDEPENDENT_DRIVER", "TRUCK_OWNER", "TRANSPORT_COMPANY"], [])
  const verificationOptions = useMemo(() => ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "EXPIRED"], [])

  const load = async () => {
    setLoading(true)
    setError(null)

    const res = await apiClient.adminListCamionneurs({
      page,
      pageSize,
      q: q.trim() || undefined,
      truckerType: truckerType || undefined,
      verificationStatus: verificationStatus || undefined,
      isAvailable: isAvailable === "" ? undefined : isAvailable === "true",
      organizationId: organizationId || undefined,
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
    setTruckerType("")
    setVerificationStatus("")
    setIsAvailable("")
    setOrganizationId("")
    setCreatedFrom("")
    setCreatedTo("")
    setSort("createdAt_desc")
    setPageSize(20)
    setPage(1)
    await load()
  }

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Camionneurs</h1>
          <p className="mt-1 text-sm text-gray-600">Profils camionneurs (TruckerProfile) avec vérification, véhicules et stats.</p>
        </div>

        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => setCreateOpen((v) => !v)}
            className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#0b1220]"
          >
            {createOpen ? "Fermer" : "Créer"}
          </button>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-semibold">{data?.total ?? "—"}</p>
          </div>
        </div>
      </div>

      {createOpen ? (
        <div className="card mb-6">
          <div>
            <p className="text-sm font-semibold">Créer un camionneur</p>
            <p className="text-xs text-gray-500">Crée un compte utilisateur (role=TRUCKER) + un profil camionneur.</p>
          </div>

          {createError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-700 font-semibold">Erreur</p>
              <p className="text-sm text-red-700">{createError}</p>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-gray-600">Email</label>
              <input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Téléphone</label>
              <input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Mot de passe</label>
              <input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Type</label>
              <select value={createTruckerType} onChange={(e) => setCreateTruckerType(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                {truckerTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Prénom</label>
              <input value={createFirstName} onChange={(e) => setCreateFirstName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Nom</label>
              <input value={createLastName} onChange={(e) => setCreateLastName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Ville</label>
              <input value={createCity} onChange={(e) => setCreateCity(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Organisation (optionnel)</label>
              <select
                value={createOrganizationId}
                onChange={(e) => setCreateOrganizationId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">—</option>
                {(data?.filters.organizations || []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} — {o.city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              disabled={createLoading}
              onClick={async () => {
                setCreateLoading(true)
                setCreateError(null)

                const res = await apiClient.adminCreateCamionneur({
                  email: createEmail.trim(),
                  phone: createPhone.trim(),
                  password: createPassword,
                  firstName: createFirstName.trim() || null,
                  lastName: createLastName.trim() || null,
                  city: createCity.trim(),
                  truckerType: createTruckerType,
                  organizationId: createOrganizationId || null,
                })

                if (!res.success) {
                  setCreateError(res.error || "Erreur lors de la création")
                  setCreateLoading(false)
                  return
                }

                setCreateEmail("")
                setCreatePhone("")
                setCreatePassword("")
                setCreateFirstName("")
                setCreateLastName("")
                setCreateCity("")
                setCreateTruckerType("INDEPENDENT_DRIVER")
                setCreateOrganizationId("")
                setCreateOpen(false)
                await load()
                setCreateLoading(false)
              }}
              className="px-4 py-2 rounded-lg bg-[#E8714D] text-white text-sm font-semibold hover:bg-[#d95f3c] disabled:opacity-50"
            >
              {createLoading ? "Création..." : "Créer"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <label className="text-xs font-semibold text-gray-600">Recherche</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ID, nom, téléphone, email, ville, OM/MM..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8714D]/40"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Type</label>
            <select
              value={truckerType}
              onChange={(e) => setTruckerType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              {truckerTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Vérification</label>
            <select
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              {verificationOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
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
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Disponibilité</label>
            <select
              value={isAvailable}
              onChange={(e) => setIsAvailable(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              <option value="true">Disponible</option>
              <option value="false">Indisponible</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-gray-600">Organisation</label>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Toutes</option>
              {(data?.filters.organizations || []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} — {o.city}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Du</label>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Au</label>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-gray-600">Tri</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="createdAt_desc">Récent</option>
              <option value="createdAt_asc">Ancien</option>
              <option value="rating_desc">Note</option>
              <option value="missions_desc">Missions</option>
              <option value="available_desc">Dispo</option>
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
          <p className="text-sm text-gray-700 font-semibold">Aucun camionneur</p>
          <p className="mt-1 text-sm text-gray-600">Aucun résultat pour les filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-[1600px] w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Camionneur</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Vérification</th>
                <th className="px-4 py-3">Dispo</th>
                <th className="px-4 py-3">Véhicules</th>
                <th className="px-4 py-3">Missions</th>
                <th className="px-4 py-3">Offres</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Créé</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((it) => (
                <tr key={it.id} className="text-sm hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{formatName(it.user)}</div>
                    <div className="text-xs text-gray-500 font-mono">{it.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{it.user.phone}</div>
                    <div className="text-xs text-gray-500">{it.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it.city}</td>
                  <td className="px-4 py-3 text-gray-700">{it.truckerType}</td>
                  <td className="px-4 py-3 text-gray-700">{it.organization?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + verificationBadgeClass(it.verificationStatus)}>
                      {it.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {it.isAvailable ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-1 text-xs font-semibold">Oui</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 text-xs font-semibold">Non</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="text-xs text-gray-500">{it._count.vehicles} total</div>
                    <div className="text-sm">
                      {(it.vehicles || []).map((v) => v.licensePlate).filter(Boolean).join(", ") || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it._count.missions}</td>
                  <td className="px-4 py-3 text-gray-700">{it._count.quotes}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="font-semibold">{it.averageRating.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">{it.totalRatings} avis</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{new Date(it.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/camionneurs/${it.id}`}
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
          Page {data?.page ?? 1} / {data?.totalPages ?? 1} — {data?.total ?? 0} camionneurs
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
