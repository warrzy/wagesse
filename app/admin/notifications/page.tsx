"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

type Row = {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
  user: { firstName: string | null; lastName: string | null; phone: string; role: string } | null
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.adminListNotifications().then((res) => {
      if (!res.success) {
        setError(res.error || "Notifications indisponibles")
        setLoading(false)
        return
      }
      setItems(((res.data as { items: Row[] })?.items) || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="container-max max-w-6xl">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <p className="mt-2 text-sm text-gray-600">Messages internes envoyés aux utilisateurs et aux administrateurs.</p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-gray-500">Chargement…</p> : null}
      {!loading && items.length === 0 ? <p className="mt-6 text-sm text-gray-500">Aucune notification.</p> : null}
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="card">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.type}</p>
            <p className="mt-1 font-semibold">{item.title}</p>
            <p className="mt-1 text-sm text-gray-700">{item.message}</p>
            <p className="mt-2 text-xs text-gray-500">
              {new Date(item.createdAt).toLocaleString("fr-FR")}
              {item.user ? ` · ${item.user.role} · ${item.user.phone}` : ""}
              {item.read ? " · lue" : " · non lue"}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
