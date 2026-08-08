"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type Row = {
  id: string
  firstName: string | null
  lastName: string | null
  phone: string
  email: string
  role: string
  status: string
  createdAt: string
  lastLoginAt: string | null
  customerProfile: { id: string; totalRequests: number } | null
  truckerProfile: { id: string; totalMissions: number; verificationStatus: string } | null
  creditWallet: { balance: number; purchasedBalance: number; subscriptionBalance: number } | null
  stats: {
    requests: number
    missions: number
    quotes: number
    payments: number
  }
}

type ListResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: Row[]
}

function formatName(u: { firstName: string | null; lastName: string | null }) {
  const fn = u.firstName?.trim() || ""
  const ln = u.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

function roleBadgeClass(role: string) {
  switch (role) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "TRUCKER":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "CLIENT":
      return "bg-gray-50 text-gray-700 border-gray-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-50 text-green-700 border-green-200"
    case "SUSPENDED":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "BLOCKED":
      return "bg-red-50 text-red-700 border-red-200"
    case "DELETED":
      return "bg-gray-100 text-gray-700 border-gray-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

export default function AdminUtilisateursPage() {
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
  const [createRole, setCreateRole] = useState("CLIENT")
  const [createStatus, setCreateStatus] = useState("ACTIVE")

  const [q, setQ] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState("")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [sort, setSort] = useState("createdAt_desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const roleOptions = useMemo(() => ["VISITOR", "CLIENT", "TRUCKER", "OPERATOR", "ADMIN", "SUPER_ADMIN"], [])
  const statusOptions = useMemo(() => ["ACTIVE", "SUSPENDED", "BLOCKED", "DELETED"], [])

  const load = async () => {
    setLoading(true)
    setError(null)

    const res = await apiClient.adminListUtilisateurs({
      page,
      pageSize,
      q: q.trim() || undefined,
      role: role || undefined,
      status: status || undefined,
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
    setRole("")
    setStatus("")
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
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="mt-1 text-sm text-gray-600">Tous les comptes (modèle User).</p>
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Créer un utilisateur</p>
              <p className="text-xs text-gray-500">Email, téléphone et mot de passe sont requis.</p>
            </div>
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
              <input
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Téléphone</label>
              <input
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Mot de passe</label>
              <input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Rôle</label>
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Prénom</label>
              <input
                value={createFirstName}
                onChange={(e) => setCreateFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Nom</label>
              <input
                value={createLastName}
                onChange={(e) => setCreateLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Statut</label>
              <select
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3 flex items-end justify-end">
              <button
                type="button"
                disabled={createLoading}
                onClick={async () => {
                  setCreateLoading(true)
                  setCreateError(null)
                  const res = await apiClient.adminCreateUtilisateur({
                    email: createEmail.trim(),
                    phone: createPhone.trim(),
                    password: createPassword,
                    firstName: createFirstName.trim() || null,
                    lastName: createLastName.trim() || null,
                    role: createRole,
                    status: createStatus,
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
                  setCreateRole("CLIENT")
                  setCreateStatus("ACTIVE")
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
        </div>
      ) : null}

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <label className="text-xs font-semibold text-gray-600">Recherche</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ID, nom, prénom, téléphone, email..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8714D]/40"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
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
            <label className="text-xs font-semibold text-gray-600">Inscrit du</label>
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
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-600">Tri</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="createdAt_desc">Inscription (desc)</option>
              <option value="createdAt_asc">Inscription (asc)</option>
              <option value="lastLogin_desc">Dernière connexion (desc)</option>
              <option value="lastLogin_asc">Dernière connexion (asc)</option>
              <option value="role_asc">Rôle (A-Z)</option>
              <option value="role_desc">Rôle (Z-A)</option>
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
          <p className="text-sm text-gray-700 font-semibold">Aucun utilisateur</p>
          <p className="mt-1 text-sm text-gray-600">Aucun résultat pour les filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-[1500px] w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Inscription</th>
                <th className="px-4 py-3">Dernière activité</th>
                <th className="px-4 py-3">Annonces</th>
                <th className="px-4 py-3">Offres</th>
                <th className="px-4 py-3">Paiements</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((it) => (
                <tr key={it.id} className="text-sm hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{it.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{formatName(it)}</div>
                    <div className="text-xs text-gray-500">{it.truckerProfile ? "Camionneur" : it.customerProfile ? "Client" : "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it.phone}</td>
                  <td className="px-4 py-3 text-gray-700">{it.email}</td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + roleBadgeClass(it.role)}>
                      {it.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + statusBadgeClass(it.status)}>
                      {it.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {it.creditWallet ? (
                      <div>
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="font-semibold">{it.creditWallet.balance}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{new Date(it.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {it.lastLoginAt ? new Date(it.lastLoginAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="inline-flex items-center justify-center min-w-[28px] rounded-full bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1">
                      {it.stats.requests}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="inline-flex items-center justify-center min-w-[28px] rounded-full bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1">
                      {it.stats.quotes}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="inline-flex items-center justify-center min-w-[28px] rounded-full bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1">
                      {it.stats.payments}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/utilisateurs/${it.id}`}
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
          Page {data?.page ?? 1} / {data?.totalPages ?? 1} — {data?.total ?? 0} utilisateurs
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
