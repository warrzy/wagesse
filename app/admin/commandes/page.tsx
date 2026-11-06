"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type Row = {
  id: string
  reference: string
  status: string
  kind: string
  title: string
  amountXof: number
  currency: string
  credits: number
  createdAt: string
  user: { firstName: string | null; lastName: string | null; phone: string; email: string }
}

export default function AdminCommandesPage() {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [kind, setKind] = useState("")
  const [items, setItems] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const res = await apiClient.adminListCommandes({
      q: q.trim() || undefined,
      status: status || undefined,
      kind: kind || undefined,
      pageSize: 50,
    })
    if (!res.success) {
      setError(res.error || "Chargement impossible")
      return
    }
    setError(null)
    setItems(((res.data as { items: Row[] })?.items) || [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="container-max max-w-6xl">
      <h1 className="text-2xl font-bold">Commandes</h1>
      <p className="mt-1 text-sm text-gray-600">Demandes de règlement en attente de vérification.</p>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="input-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Référence, téléphone, nom…" />
        <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <select className="input-field" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Tous les types</option>
          <option value="CREDIT_PACK">Pack de crédits</option>
          <option value="SUBSCRIPTION">Forfait</option>
        </select>
        <button type="button" onClick={load} className="rounded-lg bg-[#E8714D] text-white text-sm font-semibold">
          Filtrer
        </button>
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6 overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Demandeur</th>
              <th className="px-4 py-3">Offre</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <Link href={`/admin/commandes/${item.id}`} className="font-semibold text-[#E8714D]">
                    {item.reference}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {(item.user.firstName || "") + " " + (item.user.lastName || "")}
                  <div className="text-xs text-gray-500">{item.user.phone}</div>
                </td>
                <td className="px-4 py-3">
                  {item.title}
                  <div className="text-xs text-gray-500">{item.credits} crédits</div>
                </td>
                <td className="px-4 py-3">{item.amountXof.toLocaleString("fr-FR")} {item.currency}</td>
                <td className="px-4 py-3">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
