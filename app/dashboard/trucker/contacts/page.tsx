"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"

type ContactUnlockItem = {
  id: string
  requestId: string
  createdAt: string
  unlockedContacts: any
  request: {
    id: string
    pickupCity: string
    dropoffCity: string
    materialDescription: string | null
  }
}

function pickContact(unlockedContacts: any): { phone?: string; email?: string } {
  if (!unlockedContacts) return {}
  if (Array.isArray(unlockedContacts)) {
    const first = unlockedContacts[0]
    if (first && typeof first === "object") {
      return {
        phone: typeof first.phone === "string" ? first.phone : undefined,
        email: typeof first.email === "string" ? first.email : undefined,
      }
    }
  }
  return {}
}

export default function TruckerContactsPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ContactUnlockItem[]>([])

  useEffect(() => {
    const load = async () => {
      const res = await (apiClient as any).request("GET", "/contacts")
      if (res.success) {
        setItems((res.data as ContactUnlockItem[]) || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-10 pb-16">
        <div className="container-max max-w-4xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Mes contacts</h1>
              <p className="mt-2 text-gray-600">Retrouvez les coordonnées que vous avez déjà débloquées.</p>
            </div>
            <Link href="/pricing" className="text-sm font-semibold text-[#E8714D] hover:underline">
              Acheter des crédits
            </Link>
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="card">
                <p className="text-sm text-gray-500">Chargement…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="card">
                <p className="text-sm text-gray-500">Aucun contact débloqué pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => {
                  const c = pickContact(it.unlockedContacts)
                  return (
                    <div key={it.id} className="card-hover">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#0F172A]">
                            {it.request.pickupCity} → {it.request.dropoffCity}
                          </p>
                          <p className="text-sm text-gray-600">
                            {it.request.materialDescription || "Matériau non précisé"}
                          </p>
                          <p className="mt-2 text-xs text-gray-500">
                            Débloqué le {new Date(it.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <Link
                          href={`/dashboard/trucker/requests/${it.requestId}`}
                          className="text-sm font-semibold text-[#E8714D] hover:underline"
                        >
                          Voir la demande
                        </Link>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3">
                          <p className="text-xs text-gray-500">Téléphone</p>
                          <p className="font-semibold text-[#0F172A]">{c.phone || "—"}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3">
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="font-semibold text-[#0F172A]">{c.email || "—"}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
