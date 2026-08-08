"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"

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

export default function AdminAnnonceDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const [editPickupCity, setEditPickupCity] = useState("")
  const [editDropoffCity, setEditDropoffCity] = useState("")
  const [editQuantity, setEditQuantity] = useState<number>(0)
  const [editUnit, setEditUnit] = useState("TONNES")
  const [editRequestedDate, setEditRequestedDate] = useState("")
  const [editStatus, setEditStatus] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const res = await apiClient.adminGetAnnonce(id)
      if (!res.success) {
        setError(res.error || "Erreur lors du chargement")
        setLoading(false)
        return
      }

      const d: any = res.data
      setData(d)
      setEditPickupCity(String(d?.pickupCity || ""))
      setEditDropoffCity(String(d?.dropoffCity || ""))
      setEditQuantity(Number(d?.quantity ?? 0))
      setEditUnit(String(d?.unit || "TONNES"))
      setEditRequestedDate(d?.requestedDate ? String(d.requestedDate).slice(0, 10) : "")
      setEditStatus(String(d?.status || ""))
      setLoading(false)
    }

    if (id) load()
  }, [id])

  const onSave = async () => {
    if (!id) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminUpdateAnnonce(id, {
      pickupCity: editPickupCity,
      dropoffCity: editDropoffCity,
      quantity: editQuantity,
      unit: editUnit,
      requestedDate: editRequestedDate ? new Date(editRequestedDate).toISOString() : undefined,
      status: editStatus,
    })

    if (!res.success) {
      setError(res.error || "Erreur")
      setSaving(false)
      return
    }

    setEditing(false)
    setSuccess("Enregistré")
    await (async () => {
      const r = await apiClient.adminGetAnnonce(id)
      if (r.success) setData(r.data)
    })()
    setSaving(false)
  }

  const onArchive = async () => {
    if (!id) return
    const ok = window.confirm("Archiver cette annonce ? (elle n’apparaîtra plus dans la liste)")
    if (!ok) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminUpdateAnnonce(id, { archive: true })
    if (!res.success) {
      setError(res.error || "Erreur")
      setSaving(false)
      return
    }

    setSuccess("Annonce archivée")
    setSaving(false)
  }

  const acceptedQuoteId = useMemo(() => {
    const quotes = (data?.quotes || []) as any[]
    const accepted = quotes.find((q) => q.status === "ACCEPTED")
    return accepted?.id || null
  }, [data])

  const timeline = useMemo(() => {
    if (!data) return [] as Array<{ title: string; meta: string }>

    const items: Array<{ title: string; meta: string; at: Date }> = []
    items.push({ title: "Annonce créée", meta: new Date(data.createdAt).toLocaleString(), at: new Date(data.createdAt) })

    if (data.publishedAt) {
      items.push({ title: "Annonce publiée", meta: new Date(data.publishedAt).toLocaleString(), at: new Date(data.publishedAt) })
    }

    for (const q of data.quotes || []) {
      items.push({
        title: `Offre reçue (${q.status})`,
        meta: `${formatName(q.trucker?.user)} — ${new Date(q.createdAt).toLocaleString()}`,
        at: new Date(q.createdAt),
      })
      if (q.acceptedAt) {
        items.push({
          title: "Offre acceptée",
          meta: `${formatName(q.trucker?.user)} — ${new Date(q.acceptedAt).toLocaleString()}`,
          at: new Date(q.acceptedAt),
        })
      }
    }

    for (const m of data.missions || []) {
      items.push({
        title: `Mission créée (${m.status})`,
        meta: `${m.missionReference || m.id} — ${new Date(m.createdAt).toLocaleString()}`,
        at: new Date(m.createdAt),
      })
      for (const h of m.statusHistory || []) {
        items.push({
          title: `Mission: ${h.previousStatus || "—"} → ${h.newStatus}`,
          meta: `${new Date(h.timestamp).toLocaleString()}${h.reason ? ` — ${h.reason}` : ""}`,
          at: new Date(h.timestamp),
        })
      }
    }

    for (const u of data.contactUnlocks || []) {
      items.push({
        title: "Contact débloqué",
        meta: `${u.unlockedByUser?.phone || ""} — ${new Date(u.createdAt).toLocaleString()}`,
        at: new Date(u.createdAt),
      })
    }

    items.sort((a, b) => a.at.getTime() - b.at.getTime())
    return items.map((x) => ({ title: x.title, meta: x.meta }))
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

  if (success) {
    // keep the banner below the header on normal render
  }

  if (error) {
    return (
      <div className="container-max max-w-6xl">
        <div className="card">
          <p className="text-sm text-red-600 font-semibold">Erreur</p>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <div className="mt-4">
            <Link href="/admin/annonces" className="text-sm font-semibold text-[#E8714D] hover:underline">
              Retour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const clientUser = data?.customer?.user
  const subscription = data?.customer?.subscriptions?.[0]
  const assignedMission = (data?.missions || [])?.[0]
  const assignedTruckerUser = assignedMission?.trucker?.user

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Annonce</h1>
            <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + statusBadgeClass(data.status)}>
              {data.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 font-mono">{data.id}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v)
              setError(null)
              setSuccess(null)
              setEditPickupCity(String(data?.pickupCity || ""))
              setEditDropoffCity(String(data?.dropoffCity || ""))
              setEditQuantity(Number(data?.quantity ?? 0))
              setEditUnit(String(data?.unit || "TONNES"))
              setEditRequestedDate(data?.requestedDate ? String(data.requestedDate).slice(0, 10) : "")
              setEditStatus(String(data?.status || ""))
            }}
            className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#0b1220]"
          >
            {editing ? "Annuler" : "Modifier"}
          </button>
          <Link
            href="/admin/annonces"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retour
          </Link>
        </div>
      </div>

      {success ? (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <p className="text-sm font-semibold">Annonce</p>

            {editing ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Départ</label>
                  <input className="input-field" value={editPickupCity} onChange={(e) => setEditPickupCity(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Destination</label>
                  <input className="input-field" value={editDropoffCity} onChange={(e) => setEditDropoffCity(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Quantité</label>
                  <input type="number" className="input-field" value={editQuantity} onChange={(e) => setEditQuantity(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Unité</label>
                  <select className="input-field" value={editUnit} onChange={(e) => setEditUnit(e.target.value)}>
                    {["TONNES", "CUBIC_METERS", "NUMBER_OF_TRIPS", "FULL_TRUCK_LOAD"].map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Date souhaitée</label>
                  <input type="date" className="input-field" value={editRequestedDate} onChange={(e) => setEditRequestedDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Statut</label>
                  <select className="input-field" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    {[
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
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={onSave}
                    className="px-4 py-2 rounded-lg bg-[#E8714D] text-white text-sm font-semibold hover:bg-[#D65A3A] disabled:opacity-50"
                  >
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Créée</p>
                <p className="font-semibold">{new Date(data.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date souhaitée</p>
                <p className="font-semibold">{new Date(data.requestedDate).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Départ</p>
                <p className="font-semibold">{data.pickupCity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Destination</p>
                <p className="font-semibold">{data.dropoffCity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Matériau</p>
                <p className="font-semibold">{data.material?.name || data.materialDescription || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Quantité</p>
                <p className="font-semibold">
                  {data.quantity} {data.unit}
                </p>
              </div>
            </div>

            {data.notes ? (
              <div className="mt-4">
                <p className="text-xs text-gray-500">Commentaire</p>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{data.notes}</p>
              </div>
            ) : null}
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Offres reçues</p>
            <div className="mt-4 divide-y divide-gray-200">
              {(data.quotes || []).length === 0 ? (
                <p className="text-sm text-gray-600">Aucune offre.</p>
              ) : (
                (data.quotes || []).map((q: any) => (
                  <div key={q.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatName(q.trucker?.user)}
                          {acceptedQuoteId === q.id ? (
                            <span className="ml-2 inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs font-semibold">
                              Offre acceptée
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-gray-500">{q.trucker?.user?.phone || "—"}</p>
                        <p className="text-xs text-gray-500">{new Date(q.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{Math.round(q.totalPrice)} {q.currencyCode}</p>
                        <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + statusBadgeClass(q.status)}>
                          {q.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Véhicule</p>
                        <p className="text-sm text-gray-700">
                          {q.vehicle?.licensePlate || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Date proposée</p>
                        <p className="text-sm text-gray-700">{new Date(q.proposedDate).toLocaleString()}</p>
                      </div>
                    </div>

                    {q.comments ? (
                      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{q.comments}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Transactions liées</p>
            <div className="mt-4 space-y-2 text-sm">
              {(data.contactUnlocks || []).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between">
                  <span>Déblocage contact</span>
                  <span className="text-gray-600">{new Date(u.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {assignedMission?.payment ? (
                <div className="flex items-center justify-between">
                  <span>Paiement mission ({assignedMission.payment.status})</span>
                  <span className="text-gray-600">{Math.round(assignedMission.payment.amount)} {assignedMission.payment.currency}</span>
                </div>
              ) : null}
              {(data.contactUnlocks || []).length === 0 && !assignedMission?.payment ? (
                <p className="text-sm text-gray-600">Aucune transaction liée détectée.</p>
              ) : null}
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
            <p className="text-sm font-semibold">Client</p>
            <div className="mt-4 text-sm">
              <p className="font-semibold text-gray-900">{formatName(clientUser)}</p>
              <p className="text-gray-600">{clientUser?.phone || "—"}</p>
              <p className="text-gray-600">{clientUser?.email || "—"}</p>
              <div className="mt-3 text-xs text-gray-600">
                <p>Rôle: {clientUser?.role || "—"}</p>
                <p>Statut: {clientUser?.status || "—"}</p>
                <p>
                  Abonnement: {subscription?.plan?.tier ? `${subscription.plan.tier} (${subscription.status})` : "—"}
                </p>
              </div>

              {clientUser?.id ? (
                <div className="mt-4">
                  <Link href={`/admin/utilisateurs/${clientUser.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                    Voir fiche utilisateur
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Camionneur assigné</p>
            <div className="mt-4 text-sm">
              {assignedTruckerUser ? (
                <>
                  <p className="font-semibold text-gray-900">{formatName(assignedTruckerUser)}</p>
                  <p className="text-gray-600">{assignedTruckerUser.phone}</p>
                  <p className="text-xs text-gray-600 mt-2">Mission: {assignedMission?.missionReference || assignedMission?.id}</p>
                  <p className="text-xs text-gray-600">Statut mission: {assignedMission?.status}</p>
                  <p className="text-xs text-gray-600">
                    Véhicule: {assignedMission?.vehicle?.licensePlate || "—"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">Aucun camionneur assigné.</p>
              )}
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Actions admin</p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="w-full px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#0b1220]"
              >
                Modifier
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onArchive}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Archiver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
