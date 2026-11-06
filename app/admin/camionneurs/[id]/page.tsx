"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"

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

function formatName(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  const fn = u?.firstName?.trim() || ""
  const ln = u?.lastName?.trim() || ""
  const full = `${fn} ${ln}`.trim()
  return full || "—"
}

function TimelineItem({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 h-2 w-2 rounded-full bg-[#E8714D]" />
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{meta}</p>
      </div>
    </div>
  )
}

export default function AdminCamionneurDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const [fCity, setFCity] = useState("")
  const [fTruckerType, setFTruckerType] = useState("INDEPENDENT_DRIVER")
  const [fVerificationStatus, setFVerificationStatus] = useState("PENDING")
  const [fIsAvailable, setFIsAvailable] = useState(true)
  const [fOrganizationId, setFOrganizationId] = useState("")

  const [fUserEmail, setFUserEmail] = useState("")
  const [fUserPhone, setFUserPhone] = useState("")
  const [fUserFirstName, setFUserFirstName] = useState("")
  const [fUserLastName, setFUserLastName] = useState("")
  const [fUserStatus, setFUserStatus] = useState("ACTIVE")

  const truckerTypeOptions = useMemo(() => ["INDEPENDENT_DRIVER", "TRUCK_OWNER", "TRANSPORT_COMPANY"], [])
  const verificationOptions = useMemo(() => ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "EXPIRED"], [])
  const userStatusOptions = useMemo(() => ["ACTIVE", "SUSPENDED", "BLOCKED", "DELETED"], [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const res = await apiClient.adminGetCamionneur(id)
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
    if (!data) return
    setFCity(data.city || "")
    setFTruckerType(data.truckerType || "INDEPENDENT_DRIVER")
    setFVerificationStatus(data.verificationStatus || "PENDING")
    setFIsAvailable(Boolean(data.isAvailable))
    setFOrganizationId(data.organizationId || "")

    setFUserEmail(data.user?.email || "")
    setFUserPhone(data.user?.phone || "")
    setFUserFirstName(data.user?.firstName || "")
    setFUserLastName(data.user?.lastName || "")
    setFUserStatus(data.user?.status || "ACTIVE")
  }, [data])

  const timeline = useMemo(() => {
    if (!data) return [] as Array<{ title: string; meta: string; at: Date }>

    const items: Array<{ title: string; meta: string; at: Date }> = []

    items.push({ title: "Profil créé", meta: new Date(data.createdAt).toLocaleString(), at: new Date(data.createdAt) })

    if (data.lastAvailabilityUpdate) {
      items.push({
        title: `Disponibilité: ${data.isAvailable ? "disponible" : "indisponible"}`,
        meta: new Date(data.lastAvailabilityUpdate).toLocaleString(),
        at: new Date(data.lastAvailabilityUpdate),
      })
    }

    for (const d of data.documents || []) {
      items.push({
        title: `Document: ${d.documentType} (${d.status})`,
        meta: `${new Date(d.createdAt).toLocaleString()}${d.expiresAt ? ` — expire: ${new Date(d.expiresAt).toLocaleDateString()}` : ""}`,
        at: new Date(d.createdAt),
      })
    }

    for (const m of data.missions || []) {
      items.push({
        title: `Mission (${m.status})`,
        meta: `${m.missionReference || m.id} — ${new Date(m.createdAt).toLocaleString()}`,
        at: new Date(m.createdAt),
      })
    }

    for (const q of data.quotes || []) {
      items.push({
        title: `Offre (${q.status})`,
        meta: `${q.id} — ${Math.round(q.totalPrice)} ${q.currencyCode} — ${new Date(q.createdAt).toLocaleString()}`,
        at: new Date(q.createdAt),
      })
    }

    items.sort((a, b) => a.at.getTime() - b.at.getTime())
    return items
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
            <Link href="/admin/camionneurs" className="text-sm font-semibold text-[#E8714D] hover:underline">
              Retour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const user = data.user

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Camionneur</h1>
            <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + verificationBadgeClass(data.verificationStatus)}>
              {data.verificationStatus}
            </span>
            {data.isAvailable ? (
              <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-1 text-xs font-semibold">Disponible</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 text-xs font-semibold">Indisponible</span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 font-mono">{data.id}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditOpen((v) => !v)
              setSaveError(null)
              setSaveSuccess(null)
            }}
            className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#0b1220]"
          >
            {editOpen ? "Fermer" : "Modifier"}
          </button>
          <Link
            href="/admin/camionneurs"
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
              <p className="text-xs text-gray-500">Mise à jour du profil et du compte utilisateur lié.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={saveLoading}
                onClick={async () => {
                  const ok = window.confirm("Archiver ce camionneur ?")
                  if (!ok) return

                  setSaveLoading(true)
                  setSaveError(null)
                  setSaveSuccess(null)

                  const res = await apiClient.adminUpdateCamionneur(id, { archive: true })
                  if (!res.success) {
                    setSaveError(res.error || "Erreur lors de l'archivage")
                    setSaveLoading(false)
                    return
                  }

                  setSaveSuccess("Camionneur archivé")
                  setData(res.data)
                  setSaveLoading(false)
                }}
                className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 disabled:opacity-50"
              >
                Archiver
              </button>
              <button
                type="button"
                disabled={saveLoading}
                onClick={async () => {
                  setSaveLoading(true)
                  setSaveError(null)
                  setSaveSuccess(null)

                  const res = await apiClient.adminUpdateCamionneur(id, {
                    city: fCity.trim(),
                    truckerType: fTruckerType,
                    verificationStatus: fVerificationStatus,
                    isAvailable: fIsAvailable,
                    organizationId: fOrganizationId || null,
                    userEmail: fUserEmail.trim(),
                    userPhone: fUserPhone.trim(),
                    userFirstName: fUserFirstName.trim() || null,
                    userLastName: fUserLastName.trim() || null,
                    userStatus: fUserStatus,
                  })

                  if (!res.success) {
                    setSaveError(res.error || "Erreur lors de la sauvegarde")
                    setSaveLoading(false)
                    return
                  }

                  setSaveSuccess("Modifications enregistrées")
                  setData(res.data)
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
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Ville</label>
              <input value={fCity} onChange={(e) => setFCity(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Type</label>
              <select value={fTruckerType} onChange={(e) => setFTruckerType(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                {truckerTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Vérification</label>
              <select value={fVerificationStatus} onChange={(e) => setFVerificationStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                {verificationOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Disponibilité</label>
              <select value={String(fIsAvailable)} onChange={(e) => setFIsAvailable(e.target.value === "true")} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="true">Disponible</option>
                <option value="false">Indisponible</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label className="text-xs font-semibold text-gray-600">Organisation ID (optionnel)</label>
              <input value={fOrganizationId} onChange={(e) => setFOrganizationId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-gray-600">Email utilisateur</label>
              <input value={fUserEmail} onChange={(e) => setFUserEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Téléphone utilisateur</label>
              <input value={fUserPhone} onChange={(e) => setFUserPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Statut utilisateur</label>
              <select value={fUserStatus} onChange={(e) => setFUserStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                {userStatusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3" />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Prénom utilisateur</label>
              <input value={fUserFirstName} onChange={(e) => setFUserFirstName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600">Nom utilisateur</label>
              <input value={fUserLastName} onChange={(e) => setFUserLastName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <p className="text-sm font-semibold">Identité & Profil</p>
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
                <p className="text-xs text-gray-500">Ville</p>
                <p className="font-semibold">{data.city}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="font-semibold">{data.truckerType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stats</p>
                <p className="font-semibold">{data.totalMissions} missions — {data.averageRating.toFixed(1)} ({data.totalRatings} avis)</p>
              </div>
            </div>

            {data.organization ? (
              <div className="mt-4 text-sm">
                <p className="text-xs text-gray-500">Organisation</p>
                <p className="font-semibold">{data.organization.name} — {data.organization.city}</p>
              </div>
            ) : null}
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Zones de service</p>
            <div className="mt-4">
              {(data.serviceAreas || []).length === 0 ? (
                <p className="text-sm text-gray-600">Aucune zone renseignée.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {(data.serviceAreas || []).map((s: any) => (
                    <div key={s.id} className="py-2 text-sm flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{s.city}{s.provinceCode ? ` (${s.provinceCode})` : ""}</span>
                      <span className="text-xs text-gray-600">Rayon: {s.radiusKm ?? 50} km</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Véhicules</p>
            <div className="mt-4">
              {(data.vehicles || []).length === 0 ? (
                <p className="text-sm text-gray-600">Aucun véhicule.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {(data.vehicles || []).map((v: any) => (
                    <div key={v.id} className="py-2 text-sm flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{v.licensePlate}</p>
                        <p className="text-xs text-gray-500">{v.brand} {v.model} ({v.year}) — {v.vehicleType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">{v.capacityTonnes}t</p>
                        <p className="text-xs text-gray-600">Opérationnel: {v.isOperational ? "Oui" : "Non"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Activité</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-600">Offres (20 dernières)</p>
                <div className="mt-2 divide-y divide-gray-200">
                  {(data.quotes || []).length === 0 ? (
                    <p className="text-sm text-gray-600 py-2">—</p>
                  ) : (
                    (data.quotes || []).map((q: any) => (
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
                <p className="text-xs font-semibold text-gray-600">Missions (20 dernières)</p>
                <div className="mt-2 divide-y divide-gray-200">
                  {(data.missions || []).length === 0 ? (
                    <p className="text-sm text-gray-600 py-2">—</p>
                  ) : (
                    (data.missions || []).map((m: any) => (
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
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold">Historique</p>
              <span className="text-xs text-gray-500">Timeline générée depuis DB</span>
            </div>
            <div className="mt-4 space-y-4">
              {timeline.length === 0 ? <p className="text-sm text-gray-600">Aucun historique.</p> : null}
              {timeline.map((t, idx) => (
                <TimelineItem key={idx} title={t.title} meta={t.meta} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <p className="text-sm font-semibold">Documents</p>
            <div className="mt-4">
              {(data.documents || []).length === 0 ? (
                <p className="text-sm text-gray-600">Aucun document.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {(data.documents || []).map((d: any) => (
                    <div key={d.id} className="py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{d.documentType}</span>
                        <span className="text-xs text-gray-600">{d.status}</span>
                      </div>
                      <div className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</div>
                      {d.fileUrl ? (
                        <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#E8714D] hover:underline">
                          Ouvrir
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Paiement & vérification</p>
            <div className="mt-4 text-sm">
              <p className="text-gray-600">OM: <span className="font-semibold text-gray-900">{data.orangeMoneyNumber || "—"}</span></p>
              <p className="text-gray-600">Mobile Money: <span className="font-semibold text-gray-900">{data.mobileMoneyNumber || "—"}</span></p>
              <p className="text-gray-600">Licence: <span className="font-semibold text-gray-900">{data.operatingLicense || "—"}</span></p>
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Actions admin</p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={saveLoading}
                onClick={async () => {
                  setSaveLoading(true)
                  setSaveError(null)
                  const res = await apiClient.adminUpdateCamionneur(id, { verificationStatus: "VERIFIED" })
                  setSaveLoading(false)
                  if (!res.success) {
                    setSaveError(res.error || "Validation impossible")
                    return
                  }
                  setData(res.data)
                  setSaveSuccess("Profil validé")
                }}
                className="w-full px-4 py-2 rounded-lg bg-[#E8714D] text-white text-sm font-semibold disabled:opacity-50"
              >
                Valider le profil
              </button>
              <button
                type="button"
                disabled={saveLoading}
                onClick={async () => {
                  setSaveLoading(true)
                  setSaveError(null)
                  const res = await apiClient.adminUpdateCamionneur(id, { verificationStatus: "REJECTED" })
                  setSaveLoading(false)
                  if (!res.success) {
                    setSaveError(res.error || "Refus impossible")
                    return
                  }
                  setData(res.data)
                  setSaveSuccess("Profil refusé")
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold disabled:opacity-50"
              >
                Refuser le profil
              </button>
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Compte utilisateur</p>
            <div className="mt-4">
              <Link href={`/admin/utilisateurs/${data.userId}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                Ouvrir la fiche utilisateur
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
