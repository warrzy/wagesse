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
    case "PAID":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "ACCEPTED":
    case "TRUCK_EN_ROUTE_PICKUP":
    case "ARRIVED_PICKUP":
    case "LOADING_IN_PROGRESS":
    case "EN_ROUTE_DELIVERY":
    case "ARRIVED_DELIVERY":
    case "DELIVERED":
    case "PENDING_CONFIRMATION":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "COMPLETED":
      return "bg-green-50 text-green-700 border-green-200"
    case "CANCELLED":
    case "DISPUTED":
    case "REFUNDED":
      return "bg-red-50 text-red-700 border-red-200"
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

export default function AdminTransportDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const [editScheduledDate, setEditScheduledDate] = useState("")
  const [editContractPrice, setEditContractPrice] = useState<number>(0)
  const [editStatus, setEditStatus] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const res = await apiClient.adminGetTransport(id)
      if (!res.success) {
        setError(res.error || "Erreur lors du chargement")
        setLoading(false)
        return
      }

      const d: any = res.data
      setData(d)
      setEditScheduledDate(d?.scheduledDate ? String(d.scheduledDate).slice(0, 10) : "")
      setEditContractPrice(Number(d?.contractPrice ?? 0))
      setEditStatus(String(d?.status || ""))
      setLoading(false)
    }

    if (id) load()
  }, [id])

  const statusOptions = useMemo(
    () => [
      "DRAFT",
      "PENDING_PAYMENT",
      "PAID",
      "PENDING_ACCEPTANCE",
      "ACCEPTED",
      "TRUCK_EN_ROUTE_PICKUP",
      "ARRIVED_PICKUP",
      "LOADING_IN_PROGRESS",
      "EN_ROUTE_DELIVERY",
      "ARRIVED_DELIVERY",
      "DELIVERED",
      "PENDING_CONFIRMATION",
      "COMPLETED",
      "CANCELLED",
      "DISPUTED",
      "REFUNDED",
    ],
    []
  )

  const onSave = async () => {
    if (!id) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminUpdateTransport(id, {
      scheduledDate: editScheduledDate ? new Date(editScheduledDate).toISOString() : undefined,
      contractPrice: editContractPrice,
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
      const r = await apiClient.adminGetTransport(id)
      if (r.success) setData(r.data)
    })()
    setSaving(false)
  }

  const onArchive = async () => {
    if (!id) return
    const ok = window.confirm("Archiver ce transport ? (status = CANCELLED)")
    if (!ok) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminUpdateTransport(id, { archive: true })
    if (!res.success) {
      setError(res.error || "Erreur")
      setSaving(false)
      return
    }

    setSuccess("Transport archivé")
    setSaving(false)
    await (async () => {
      const r = await apiClient.adminGetTransport(id)
      if (r.success) setData(r.data)
    })()
  }

  const timeline = useMemo(() => {
    if (!data) return [] as Array<{ title: string; meta: string; at: Date }>

    const items: Array<{ title: string; meta: string; at: Date }> = []
    items.push({ title: "Mission créée", meta: new Date(data.createdAt).toLocaleString(), at: new Date(data.createdAt) })

    for (const h of data.statusHistory || []) {
      items.push({
        title: `Statut: ${h.previousStatus || "—"} → ${h.newStatus}`,
        meta: `${new Date(h.timestamp).toLocaleString()}${h.reason ? ` — ${h.reason}` : ""}`,
        at: new Date(h.timestamp),
      })
    }

    for (const p of data.proofs || []) {
      items.push({
        title: `Preuve (${p.proofType})`,
        meta: p.otpVerifiedAt ? `OTP vérifié: ${new Date(p.otpVerifiedAt).toLocaleString()}` : "OTP non vérifié",
        at: p.otpVerifiedAt ? new Date(p.otpVerifiedAt) : new Date(data.createdAt),
      })
    }

    if (data.payment?.initiatedAt) {
      items.push({
        title: "Paiement initié",
        meta: `${data.payment.reference} — ${new Date(data.payment.initiatedAt).toLocaleString()}`,
        at: new Date(data.payment.initiatedAt),
      })
    }
    if (data.payment?.confirmedAt) {
      items.push({
        title: "Paiement confirmé",
        meta: `${data.payment.reference} — ${new Date(data.payment.confirmedAt).toLocaleString()}`,
        at: new Date(data.payment.confirmedAt),
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
            <Link href="/admin/transports" className="text-sm font-semibold text-[#E8714D] hover:underline">
              Retour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const request = data?.request
  const client = data?.customer?.user
  const trucker = data?.trucker?.user
  const vehicle = data?.vehicle

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Transport</h1>
            <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + statusBadgeClass(data.status)}>
              {data.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 font-mono">{data.missionReference || data.id}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v)
              setError(null)
              setSuccess(null)
              setEditScheduledDate(data?.scheduledDate ? String(data.scheduledDate).slice(0, 10) : "")
              setEditContractPrice(Number(data?.contractPrice ?? 0))
              setEditStatus(String(data?.status || ""))
            }}
            className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#0b1220]"
          >
            {editing ? "Annuler" : "Modifier"}
          </button>
          <Link
            href="/admin/transports"
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
            <p className="text-sm font-semibold">Annonce & Offre retenue</p>
            <div className="mt-3">
              {request?.id ? (
                <Link href={`/admin/annonces/${request.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                  {request.id}
                </Link>
              ) : null}
              <p className="mt-1 text-sm text-gray-600">{request?.pickupCity} → {request?.dropoffCity}</p>
              <p className="text-sm text-gray-600">
                {request?.material?.name || request?.materialDescription || "—"} — {request?.quantity} {request?.unit}
              </p>
              <p className="mt-2 text-xs text-gray-500">Statut annonce: {request?.status}</p>
            </div>

            {(request?.quotes || []).length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-600">Offres sur l’annonce</p>
                <div className="mt-2 divide-y divide-gray-200">
                  {(request.quotes || []).map((q: any) => (
                    <div key={q.id} className="py-2 text-sm flex items-center justify-between">
                      <Link href={`/admin/offres/${q.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                        {q.id}
                      </Link>
                      <span className="text-xs text-gray-600">{Math.round(q.totalPrice)} {q.currencyCode} — {q.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Mission</p>

            {editing ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Planifiée</label>
                  <input type="date" className="input-field" value={editScheduledDate} onChange={(e) => setEditScheduledDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Prix contrat</label>
                  <input type="number" className="input-field" value={editContractPrice} onChange={(e) => setEditContractPrice(Number(e.target.value))} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">Statut</label>
                  <select className="input-field" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    {statusOptions.map((s) => (
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
                <p className="text-xs text-gray-500">Planifiée</p>
                <p className="font-semibold">{new Date(data.scheduledDate).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Prix contrat</p>
                <p className="font-semibold">{Math.round(data.contractPrice)} {data.contractCurrency}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Commission plateforme</p>
                <p className="font-semibold">{data.platformCommission ? Math.round(data.platformCommission) : "—"}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Paiement</p>
            <div className="mt-4 text-sm">
              {!data.payment ? (
                <p className="text-sm text-gray-600">Aucun paiement lié.</p>
              ) : (
                <>
                  <p className="font-semibold">{data.payment.reference}</p>
                  <p className="text-gray-600">{data.payment.status} — {data.payment.providerName}</p>
                  <p className="text-gray-600">{Math.round(data.payment.amount)} {data.payment.currency}</p>
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
