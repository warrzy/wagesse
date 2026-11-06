"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"

type Order = {
  id: string
  reference: string
  status: string
  kind: string
  title: string
  offerCode: string
  amountXof: number
  currency: string
  credits: number
  monthlyBoosts: number
  benefits: unknown
  badge: string | null
  paymentInstructions: string
  decisionNote: string | null
  createdAt: string
  user: { id: string; firstName: string | null; lastName: string | null; phone: string; email: string; role: string; status: string }
  events: { id: string; action: string; note: string | null; createdAt: string; actorId: string | null }[]
}

export default function AdminCommandeDetailPage() {
  const params = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const res = await apiClient.adminGetCommande(params.id)
    if (!res.success) {
      setError(res.error || "Commande introuvable")
      return
    }
    setOrder(res.data as Order)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const approve = async () => {
    setBusy(true)
    setError(null)
    const res = await apiClient.adminApproveCommande(params.id, note || undefined)
    setBusy(false)
    if (!res.success) {
      setError(res.error || "Approbation impossible")
      return
    }
    await load()
  }

  const reject = async () => {
    setBusy(true)
    setError(null)
    const res = await apiClient.adminRejectCommande(params.id, note)
    setBusy(false)
    if (!res.success) {
      setError(res.error || "Refus impossible")
      return
    }
    await load()
  }

  if (!order) {
    return <div className="container-max max-w-4xl"><p className="text-sm text-gray-500">{error || "Chargement…"}</p></div>
  }

  const benefits = Array.isArray(order.benefits) ? (order.benefits as unknown[]).map(String) : []

  return (
    <div className="container-max max-w-4xl">
      <Link href="/admin/commandes" className="text-sm font-semibold text-[#E8714D]">Retour aux commandes</Link>
      <h1 className="mt-3 text-2xl font-bold">{order.reference}</h1>
      <p className="text-sm text-gray-600">{order.status} — {order.kind}</p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-sm font-semibold">Offre figée</p>
          <p className="mt-2 font-semibold">{order.title}</p>
          <p className="text-sm text-gray-600">Code {order.offerCode}</p>
          <p className="mt-3 text-2xl font-extrabold">{order.amountXof.toLocaleString("fr-FR")} {order.currency}</p>
          <p className="mt-2 text-sm">{order.credits} crédits</p>
          <p className="text-sm">{order.monthlyBoosts} boosts</p>
          {order.badge ? <p className="text-sm">{order.badge}</p> : null}
          {benefits.length ? (
            <ul className="mt-2 text-sm list-disc pl-5">
              {benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
            </ul>
          ) : null}
        </div>
        <div className="card">
          <p className="text-sm font-semibold">Demandeur</p>
          <p className="mt-2">{order.user.firstName} {order.user.lastName}</p>
          <p className="text-sm text-gray-600">{order.user.phone}</p>
          <p className="text-sm text-gray-600">{order.user.email}</p>
          <p className="text-xs text-gray-500 mt-2">{order.user.role} — {order.user.status}</p>
          <p className="mt-4 text-sm whitespace-pre-wrap">{order.paymentInstructions}</p>
        </div>
      </div>

      <div className="card mt-4">
        <p className="text-sm font-semibold">Décision</p>
        {order.status === "PENDING" ? (
          <div className="mt-3 space-y-3">
            <textarea className="input-field min-h-24" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motif, obligatoire en cas de refus" />
            <div className="flex gap-3">
              <button type="button" disabled={busy} onClick={approve} className="px-4 py-2 rounded-lg bg-[#E8714D] text-white text-sm font-semibold disabled:opacity-50">
                Approuver et attribuer
              </button>
              <button type="button" disabled={busy} onClick={reject} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold disabled:opacity-50">
                Refuser
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-700">{order.decisionNote || "Décision déjà enregistrée."}</p>
        )}
      </div>

      <div className="card mt-4">
        <p className="text-sm font-semibold">Historique</p>
        <ul className="mt-3 space-y-2 text-sm">
          {order.events.map((event) => (
            <li key={event.id}>
              {new Date(event.createdAt).toLocaleString("fr-FR")} — {event.action}
              {event.note ? ` — ${event.note}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
