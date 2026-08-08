"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"

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

function formatName(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  const fn = u?.firstName?.trim() || ""
  const ln = u?.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const [fEmail, setFEmail] = useState("")
  const [fPhone, setFPhone] = useState("")
  const [fFirstName, setFFirstName] = useState("")
  const [fLastName, setFLastName] = useState("")
  const [fRole, setFRole] = useState("CLIENT")
  const [fStatus, setFStatus] = useState("ACTIVE")
  const [fPassword, setFPassword] = useState("")

  const roleOptions = useMemo(() => ["VISITOR", "CLIENT", "TRUCKER", "OPERATOR", "ADMIN", "SUPER_ADMIN"], [])
  const statusOptions = useMemo(() => ["ACTIVE", "SUSPENDED", "BLOCKED", "DELETED"], [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const res = await apiClient.adminGetUtilisateur(id)
      if (!res.success) {
        setError(res.error || "Erreur lors du chargement")
        setLoading(false)
        return
      }
      setData(res.data)
      setLoading(false)
    }

    if (id) load()
  }, [id])

  useEffect(() => {
    const u = data?.user
    if (!u) return
    setFEmail(u.email || "")
    setFPhone(u.phone || "")
    setFFirstName(u.firstName || "")
    setFLastName(u.lastName || "")
    setFRole(u.role || "CLIENT")
    setFStatus(u.status || "ACTIVE")
  }, [data])

  const user = data?.user
  const activity = data?.activity

  const kpis = useMemo(() => {
    if (!user) return null
    return {
      requests: user.customerProfile?.totalRequests ?? 0,
      missions: user.truckerProfile?.totalMissions ?? 0,
      walletBalance: user.creditWallet?.balance ?? null,
    }
  }, [user])

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
            <Link href="/admin/utilisateurs" className="text-sm font-semibold text-[#E8714D] hover:underline">
              Retour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Utilisateur</h1>
            <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + roleBadgeClass(user.role)}>
              {user.role}
            </span>
            <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + statusBadgeClass(user.status)}>
              {user.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 font-mono">{user.id}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditOpen((v) => !v)
              setSaveError(null)
              setSaveSuccess(null)
              setFPassword("")
            }}
            className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#0b1220]"
          >
            {editOpen ? "Fermer" : "Modifier"}
          </button>
          <Link
            href="/admin/utilisateurs"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retour
          </Link>
        </div>
      </div>

      {editOpen ? (
        <div className="card mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Édition</p>
              <p className="text-xs text-gray-500">Sauvegarde via PATCH (pas de suppression physique).</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={saveLoading}
                onClick={async () => {
                  const ok = window.confirm("Désactiver cet utilisateur ? (status=DELETED)")
                  if (!ok) return

                  setSaveLoading(true)
                  setSaveError(null)
                  setSaveSuccess(null)

                  const res = await apiClient.adminUpdateUtilisateur(id, { archive: true })
                  if (!res.success) {
                    setSaveError(res.error || "Erreur lors de la désactivation")
                    setSaveLoading(false)
                    return
                  }

                  setSaveSuccess("Utilisateur désactivé")
                  setData((prev: any) => ({ ...prev, user: res.data }))
                  setSaveLoading(false)
                }}
                className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 disabled:opacity-50"
              >
                Désactiver
              </button>
              <button
                type="button"
                disabled={saveLoading}
                onClick={async () => {
                  setSaveLoading(true)
                  setSaveError(null)
                  setSaveSuccess(null)

                  const payload: any = {
                    email: fEmail.trim(),
                    phone: fPhone.trim(),
                    firstName: fFirstName.trim() || null,
                    lastName: fLastName.trim() || null,
                    role: fRole,
                    status: fStatus,
                  }

                  if (fPassword.trim()) payload.password = fPassword

                  const res = await apiClient.adminUpdateUtilisateur(id, payload)
                  if (!res.success) {
                    setSaveError(res.error || "Erreur lors de la sauvegarde")
                    setSaveLoading(false)
                    return
                  }

                  setSaveSuccess("Modifications enregistrées")
                  setFPassword("")
                  setData((prev: any) => ({ ...prev, user: res.data }))
                  setSaveLoading(false)
                }}
                className="px-4 py-2 rounded-lg bg-[#E8714D] text-white text-sm font-semibold hover:bg-[#d95f3c] disabled:opacity-50"
              >
                {saveLoading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>

          {saveError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          ) : null}

          {saveSuccess ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <p className="text-sm text-green-700">{saveSuccess}</p>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-gray-600">Email</label>
              <input value={fEmail} onChange={(e) => setFEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Téléphone</label>
              <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Rôle</label>
              <select value={fRole} onChange={(e) => setFRole(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Statut</label>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Prénom</label>
              <input value={fFirstName} onChange={(e) => setFFirstName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Nom</label>
              <input value={fLastName} onChange={(e) => setFLastName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-6">
              <label className="text-xs font-semibold text-gray-600">Nouveau mot de passe (optionnel)</label>
              <input type="password" value={fPassword} onChange={(e) => setFPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <p className="text-sm font-semibold">Identité</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Nom</p>
                <p className="font-semibold">{formatName(user)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Téléphone</p>
                <p className="font-semibold">{user.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-semibold">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Créé le</p>
                <p className="font-semibold">{new Date(user.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Dernière connexion</p>
                <p className="font-semibold">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}</p>
              </div>
            </div>
          </div>

          {user.customerProfile ? (
            <div className="card">
              <p className="text-sm font-semibold">Profil client</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Entreprise</p>
                  <p className="font-semibold">{user.customerProfile.companyName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-semibold">{user.customerProfile.companyType || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ville</p>
                  <p className="font-semibold">{user.customerProfile.city || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Annonces totales</p>
                  <p className="font-semibold">{user.customerProfile.totalRequests ?? 0}</p>
                </div>
              </div>
            </div>
          ) : null}

          {user.truckerProfile ? (
            <div className="card">
              <p className="text-sm font-semibold">Profil camionneur</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Ville</p>
                  <p className="font-semibold">{user.truckerProfile.city || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-semibold">{user.truckerProfile.truckerType || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vérification</p>
                  <p className="font-semibold">{user.truckerProfile.verificationStatus}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Missions</p>
                  <p className="font-semibold">{user.truckerProfile.totalMissions ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Note</p>
                  <p className="font-semibold">{user.truckerProfile.averageRating ?? "—"}</p>
                </div>
              </div>

              {(user.truckerProfile.vehicles || []).length ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-600">Véhicules (10 derniers)</p>
                  <div className="mt-2 divide-y divide-gray-200">
                    {(user.truckerProfile.vehicles || []).map((v: any) => (
                      <div key={v.id} className="py-2 text-sm flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{v.licensePlate}</span>
                        <span className="text-xs text-gray-600">{v.vehicleType} — {v.capacityTonnes}t</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="card">
            <p className="text-sm font-semibold">Activité récente</p>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-600">Annonces</p>
                <div className="mt-2 divide-y divide-gray-200">
                  {(activity?.requests || []).length === 0 ? (
                    <p className="text-sm text-gray-600 py-2">—</p>
                  ) : (
                    (activity.requests || []).map((r: any) => (
                      <div key={r.id} className="py-2 text-sm flex items-center justify-between">
                        <Link href={`/admin/annonces/${r.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                          {r.id}
                        </Link>
                        <span className="text-xs text-gray-600">{r.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600">Offres</p>
                <div className="mt-2 divide-y divide-gray-200">
                  {(activity?.quotes || []).length === 0 ? (
                    <p className="text-sm text-gray-600 py-2">—</p>
                  ) : (
                    (activity.quotes || []).map((q: any) => (
                      <div key={q.id} className="py-2 text-sm flex items-center justify-between">
                        <Link href={`/admin/offres/${q.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                          {q.id}
                        </Link>
                        <span className="text-xs text-gray-600">{q.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600">Missions</p>
                <div className="mt-2 divide-y divide-gray-200">
                  {(activity?.missions || []).length === 0 ? (
                    <p className="text-sm text-gray-600 py-2">—</p>
                  ) : (
                    (activity.missions || []).map((m: any) => (
                      <div key={m.id} className="py-2 text-sm flex items-center justify-between">
                        <Link href={`/admin/transports/${m.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                          {m.missionReference || m.id}
                        </Link>
                        <span className="text-xs text-gray-600">{m.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600">Paiements</p>
                <div className="mt-2 divide-y divide-gray-200">
                  {(activity?.payments || []).length === 0 ? (
                    <p className="text-sm text-gray-600 py-2">—</p>
                  ) : (
                    (activity.payments || []).map((p: any) => (
                      <div key={p.id} className="py-2 text-sm flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{p.reference}</span>
                        <span className="text-xs text-gray-600">{p.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <p className="text-sm font-semibold">KPIs</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Annonces</p>
                <p className="text-lg font-semibold">{kpis?.requests ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Missions</p>
                <p className="text-lg font-semibold">{kpis?.missions ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Wallet</p>
                <p className="text-lg font-semibold">{kpis?.walletBalance ?? "—"}</p>
              </div>
            </div>
          </div>

          {user.creditWallet ? (
            <div className="card">
              <p className="text-sm font-semibold">Wallet crédit</p>
              <div className="mt-4 text-sm">
                <p className="text-gray-600">Balance: <span className="font-semibold text-gray-900">{user.creditWallet.balance}</span></p>
                <p className="text-gray-600">Achetés: <span className="font-semibold text-gray-900">{user.creditWallet.purchasedBalance}</span></p>
                <p className="text-gray-600">Abonnement: <span className="font-semibold text-gray-900">{user.creditWallet.subscriptionBalance}</span></p>
              </div>

              {(user.creditWallet.transactions || []).length ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-600">20 dernières transactions</p>
                  <div className="mt-2 divide-y divide-gray-200">
                    {(user.creditWallet.transactions || []).map((t: any) => (
                      <div key={t.id} className="py-2 text-sm flex items-center justify-between">
                        <span className="text-gray-700">{t.type} ({t.amount})</span>
                        <span className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="card">
            <p className="text-sm font-semibold">Actions admin</p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="w-full px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#0b1220]"
              >
                Modifier / Désactiver
              </button>
              <p className="text-xs text-gray-500">La désactivation est gérée via le champ status (DELETED).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
