"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

type Row = {
  id: string
  action: string
  resource: string
  resourceId: string | null
  createdAt: string
  user: { firstName: string | null; lastName: string | null; phone: string; role: string } | null
}

export default function AdminLogsPage() {
  const [items, setItems] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.adminListLogs().then((res) => {
      if (!res.success) {
        setError(res.error || "Journal indisponible")
        setLoading(false)
        return
      }
      setItems(((res.data as { items: Row[] })?.items) || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="container-max max-w-6xl">
      <h1 className="text-2xl font-bold">Journal d’audit</h1>
      <p className="mt-2 text-sm text-gray-600">Modifications de compte et vérifications des transporteurs. Les commandes ont leur propre historique.</p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-gray-500">Chargement…</p> : null}
      {!loading && items.length === 0 ? <p className="mt-6 text-sm text-gray-500">Aucune opération enregistrée.</p> : null}
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="card">
            <p className="text-sm font-semibold">{item.action} — {item.resource}</p>
            <p className="mt-1 text-xs text-gray-500">
              {new Date(item.createdAt).toLocaleString("fr-FR")}
              {item.user ? ` · ${item.user.firstName || ""} ${item.user.lastName || ""} · ${item.user.phone}` : ""}
            </p>
            {item.resourceId ? <p className="mt-1 text-xs text-gray-500">{item.resourceId}</p> : null}
          </article>
        ))}
      </div>
    </div>
  )
}
