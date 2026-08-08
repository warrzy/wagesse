"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"

function statusBadgeClass(status: string) {
  switch (status) {
    case "SUCCESSFUL":
      return "bg-green-50 text-green-700 border-green-200"
    case "FAILED":
    case "CANCELLED":
      return "bg-red-50 text-red-700 border-red-200"
    case "PENDING":
    case "IN_PROGRESS":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "INITIATED":
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

export default function AdminPaiementDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const res = await apiClient.adminGetPaiement(id)
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

  const timeline = useMemo(() => {
    if (!data) return [] as Array<{ title: string; meta: string; at: Date }>

    const items: Array<{ title: string; meta: string; at: Date }> = []
    items.push({ title: "Paiement initié", meta: new Date(data.initiatedAt).toLocaleString(), at: new Date(data.initiatedAt) })

    if (data.lastAttemptAt) {
      items.push({
        title: "Dernière tentative",
        meta: new Date(data.lastAttemptAt).toLocaleString(),
        at: new Date(data.lastAttemptAt),
      })
    }

    if (data.confirmedAt) {
      items.push({ title: "Paiement confirmé", meta: new Date(data.confirmedAt).toLocaleString(), at: new Date(data.confirmedAt) })
    }

    if (data.failedAt) {
      items.push({ title: "Paiement échoué", meta: new Date(data.failedAt).toLocaleString(), at: new Date(data.failedAt) })
    }

    if (data.expiresAt) {
      items.push({ title: "Expiration", meta: new Date(data.expiresAt).toLocaleString(), at: new Date(data.expiresAt) })
    }

    for (const a of data.attempts || []) {
      items.push({
        title: `Attempt #${a.attemptNumber} (${a.status})`,
        meta: `${new Date(a.attemptedAt).toLocaleString()}${a.errorMessage ? ` — ${a.errorMessage}` : ""}`,
        at: new Date(a.attemptedAt),
      })
    }

    for (const r of data.refunds || []) {
      items.push({
        title: `Refund (${r.status})`,
        meta: `${Math.round(r.amount)} ${r.currency} — ${new Date(r.createdAt).toLocaleString()}${r.reason ? ` — ${r.reason}` : ""}`,
        at: new Date(r.createdAt),
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
            <Link href="/admin/paiements" className="text-sm font-semibold text-[#E8714D] hover:underline">
              Retour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const payer = data.payerUser
  const customerUser = data.customer?.user
  const mission = data.mission

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Paiement</h1>
            <span className={"inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold " + statusBadgeClass(data.status)}>
              {data.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 font-mono">{data.id}</p>
        </div>

        <Link
          href="/admin/paiements"
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Retour
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <p className="text-sm font-semibold">Détails</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Référence</p>
                <p className="font-semibold">{data.reference}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Montant</p>
                <p className="font-semibold">{Math.round(data.amount)} {data.currency}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="font-semibold">{data.type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Provider</p>
                <p className="font-semibold">{data.providerName}</p>
                <p className="text-xs text-gray-500">{data.providerReference || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Frais</p>
                <p className="font-semibold">{Math.round(data.platformFee)} + {Math.round(data.providerFee)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="font-semibold">{data.description || "—"}</p>
              </div>
            </div>
          </div>

          {mission ? (
            <div className="card">
              <p className="text-sm font-semibold">Mission liée</p>
              <div className="mt-3">
                <Link href={`/admin/transports/${mission.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                  {mission.missionReference || mission.id}
                </Link>
                <p className="mt-1 text-sm text-gray-600">Statut: {mission.status}</p>
                {mission.request ? (
                  <p className="text-sm text-gray-600">{mission.request.pickupCity} → {mission.request.dropoffCity}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {data.subscriptionPayment ? (
            <div className="card">
              <p className="text-sm font-semibold">Paiement abonnement</p>
              <div className="mt-4 text-sm">
                <p className="text-gray-600">Subscription: <span className="font-semibold text-gray-900">{data.subscriptionPayment.subscriptionId}</span></p>
                <p className="text-gray-600">Statut: <span className="font-semibold text-gray-900">{data.subscriptionPayment.status}</span></p>
                <p className="text-gray-600">Méthode: <span className="font-semibold text-gray-900">{data.subscriptionPayment.paymentMethod}</span></p>
                <p className="text-gray-600">PaidAt: <span className="font-semibold text-gray-900">{data.subscriptionPayment.paidAt ? new Date(data.subscriptionPayment.paidAt).toLocaleString() : "—"}</span></p>
              </div>
            </div>
          ) : null}

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
            <p className="text-sm font-semibold">Payer</p>
            <div className="mt-4 text-sm">
              <p className="font-semibold text-gray-900">{formatName(payer)}</p>
              <p className="text-gray-600">{payer?.phone || data.payer}</p>
              <p className="text-gray-600">{payer?.email || "—"}</p>
              {payer?.id ? (
                <div className="mt-4">
                  <Link href={`/admin/utilisateurs/${payer.id}`} className="text-sm font-semibold text-[#E8714D] hover:underline">
                    Voir utilisateur
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Client (profil)</p>
            <div className="mt-4 text-sm">
              <p className="font-semibold text-gray-900">{formatName(customerUser)}</p>
              <p className="text-gray-600">{customerUser?.phone || "—"}</p>
              <p className="text-gray-600">{customerUser?.email || "—"}</p>
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">Actions admin</p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled
                className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm font-semibold cursor-not-allowed"
              >
                Marquer comme remboursé (à venir)
              </button>
              <p className="text-xs text-gray-500">
                Les actions sensibles seront activées après mise en place de l'audit log.
              </p>
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold">JSON metadata</p>
            <pre className="mt-3 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto">{JSON.stringify(data.metadata, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
