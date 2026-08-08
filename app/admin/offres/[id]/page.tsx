"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"

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

export default function AdminOffreDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const [editTotalPrice, setEditTotalPrice] = useState<number>(0)
  const [editProposedDate, setEditProposedDate] = useState("")
  const [editValidUntil, setEditValidUntil] = useState("")
  const [editStatus, setEditStatus] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const res = await apiClient.adminGetOffre(id)
      if (!res.success) {
        setError(res.error || "Erreur lors du chargement")
        setLoading(false)
        return
      }

      const d: any = res.data
      setData(d)
      setEditTotalPrice(Number(d?.totalPrice ?? 0))
      setEditProposedDate(d?.proposedDate ? String(d.proposedDate).slice(0, 10) : "")
      setEditValidUntil(d?.validUntil ? String(d.validUntil).slice(0, 10) : "")
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

    const res = await apiClient.adminUpdateOffre(id, {
      totalPrice: editTotalPrice,
      proposedDate: editProposedDate ? new Date(editProposedDate).toISOString() : undefined,
      validUntil: editValidUntil ? new Date(editValidUntil).toISOString() : undefined,
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
      const r = await apiClient.adminGetOffre(id)
      if (r.success) setData(r.data)
    })()
    setSaving(false)
  }

  const onArchive = async () => {
    if (!id) return
    const ok = window.confirm("Archiver cette offre ? (status = WITHDRAWN)")
    if (!ok) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminUpdateOffre(id, { status: "WITHDRAWN" })
    if (!res.success) {
      setError(res.error || "Erreur")
      setSaving(false)
      return
    }

    setSuccess("Offre archivée")
    setSaving(false)
    await (async () => {
      const r = await apiClient.adminGetOffre(id)
      if (r.success) setData(r.data)
    })()
  }

  const timeline = useMemo(() => {
    if (!data) return [] as Array<{ title: string; meta: string; at: Date }>

    const items: Array<{ title: string; meta: string; at: Date }> = []
    items.push({ title: "Offre créée", meta: new Date(data.createdAt).toLocaleString(), at: new Date(data.createdAt) })

    if (data.acceptedAt) {
      items.push({ title: "Offre acceptée", meta: new Date(data.acceptedAt).toLocaleString(), at: new Date(data.acceptedAt) })
    }
    if (data.rejectedAt) {
      items.push({ title: "Offre rejetée", meta: new Date(data.rejectedAt).toLocaleString(), at: new Date(data.rejectedAt) })
    }

    for (const m of data.missions || []) {
      items.push({
        title: `Mission liée (${m.status})`,
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
            <Link href="/admin/offres" className="text-sm font-semibold text-[#E8714D] hover:underline">
              Retour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const client = data?.request?.customer?.user
  const trucker = data?.trucker?.user
  const request = data?.request
  const vehicle = data?.vehicle
  const mission = (data?.missions || [])?.[0]

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Offre</h1>
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
              setEditTotalPrice(Number(data?.totalPrice ?? 0))
              setEditProposedDate(data?.proposedDate ? String(data.proposedDate).slice(0, 10) : "")
              setEditValidUntil(data?.validUntil ? String(data.validUntil).slice(0, 10) : "")
              setEditStatus(String(data?.status || ""))
            }}
            className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#0b1220]"
          >
            {editing ? "Annuler" : "Modifier"}
          </button>
          <Link
            href="/admin/offres"
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
            <p className="text-sm font-semibold">Annonce associée</p>
            <div className="mt-3">
              <Link href={`/admin/annonces/${request?.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                {request?.id}
              </Link>
              <p className="mt-1 text-sm text-gray-600">{request?.pickupCity} → {request?.dropoffCity}</p>
              <p className="text-sm text-gray-600">
                {request?.material?.name || request?.materialDescription || "—"} — {request?.quantity} {request?.unit}
              </p>
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Détails de l’offre</p>

            {editing ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Prix total</label>
                  <input type="number" className="input-field" value={editTotalPrice} onChange={(e) => setEditTotalPrice(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Statut</label>
                  <select className="input-field" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    {["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN", "COUNTER_OFFER", "EXPIRED"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Date proposée</label>
                  <input type="date" className="input-field" value={editProposedDate} onChange={(e) => setEditProposedDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Valide jusqu’au</label>
                  <input type="date" className="input-field" value={editValidUntil} onChange={(e) => setEditValidUntil(e.target.value)} />
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
                <p className="text-xs text-gray-500">Date proposée</p>
                <p className="font-semibold">{new Date(data.proposedDate).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Valide jusqu’au</p>
                <p className="font-semibold">{new Date(data.validUntil).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Montant</p>
                <p className="font-semibold">{Math.round(data.totalPrice)} {data.currencyCode}</p>
              </div>
            </div>

            {(data.comments || data.specialConditions) ? (
              <div className="mt-4 text-sm">
                {data.comments ? (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Commentaire</p>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{data.comments}</p>
                  </div>
                ) : null}
                {data.specialConditions ? (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Conditions</p>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{data.specialConditions}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Mission / Paiement</p>
            <div className="mt-4 text-sm">
              {!mission ? (
                <p className="text-sm text-gray-600">Aucune mission liée.</p>
              ) : (
                <>
                  <p className="font-semibold">{mission.missionReference || mission.id}</p>
                  <p className="text-gray-600">Statut mission: {mission.status}</p>
                  {mission.payment ? (
                    <div className="mt-2">
                      <p className="text-gray-600">Paiement: {mission.payment.reference}</p>
                      <p className="text-gray-600">
                        {mission.payment.status} — {Math.round(mission.payment.amount)} {mission.payment.currency}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-gray-600">Aucun paiement lié.</p>
                  )}
                </>
              )}
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
              <p className="font-semibold text-gray-900">{formatName(client)}</p>
              <p className="text-gray-600">{client?.phone || "—"}</p>
              <p className="text-gray-600">{client?.email || "—"}</p>
              {client?.id ? (
                <div className="mt-4">
                  <Link href={`/admin/utilisateurs/${client.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                    Voir fiche utilisateur
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Camionneur</p>
            <div className="mt-4 text-sm">
              <p className="font-semibold text-gray-900">{formatName(trucker)}</p>
              <p className="text-gray-600">{trucker?.phone || "—"}</p>
              <p className="text-gray-600">{trucker?.email || "—"}</p>
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Véhicule</p>
            <div className="mt-4 text-sm">
              {vehicle ? (
                <>
                  <p className="font-semibold text-gray-900">{vehicle.licensePlate}</p>
                  <p className="text-gray-600">{vehicle.brand} {vehicle.model} ({vehicle.year})</p>
                  <p className="text-xs text-gray-600 mt-2">Capacité: {vehicle.capacityTonnes}t</p>
                  <p className="text-xs text-gray-600">Type: {vehicle.vehicleType}</p>
                  <p className="text-xs text-gray-600">Opérationnel: {vehicle.isOperational ? "Oui" : "Non"}</p>
                </>
              ) : (
                <p className="text-sm text-gray-600">Aucun véhicule renseigné.</p>
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
