"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type Row = {
  id: string
  firstName: string | null
  lastName: string | null
  phone: string
  email: string
  status: string
}

export default function AdminAdministrateursPage() {
  const [items, setItems] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.adminListUtilisateurs({ role: "ADMIN", pageSize: 50 }).then((res) => {
      if (!res.success) {
        setError(res.error || "Liste indisponible")
        setLoading(false)
        return
      }
      setItems(((res.data as { items: Row[] })?.items) || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="container-max max-w-4xl">
      <h1 className="text-2xl font-bold">Administrateurs</h1>
      <p className="mt-2 text-sm text-gray-600">Comptes dont le rôle en base est ADMIN.</p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-gray-500">Chargement…</p> : null}
      {!loading && items.length === 0 ? <p className="mt-6 text-sm text-gray-500">Aucun administrateur actif.</p> : null}
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="card flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{item.firstName} {item.lastName}</p>
              <p className="text-sm text-gray-600">{item.phone} · {item.status}</p>
            </div>
            <Link href={`/admin/utilisateurs/${item.id}`} className="text-sm font-semibold text-[#E8714D]">
              Fiche
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}
