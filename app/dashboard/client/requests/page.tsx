"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"
import { REQUEST_STATUS_LABELS } from "@/lib/config"
import { Plus } from "lucide-react"

interface TransportRequest {
  id: string
  materialDescription: string | null
  quantity: number
  unit: string
  pickupCity: string
  dropoffCity: string
  status: string
  createdAt: string
  quotes: { id: string; status: string; totalPrice: number }[]
}

export default function ClientRequestsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<TransportRequest[]>([])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
      return
    }

    apiClient.getTransportRequests({ take: "50" }).then((res) => {
      if (res.success) {
        setRequests((res.data as any)?.requests || [])
      }
      setLoading(false)
    })
  }, [router])

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gray-50 pt-8 pb-12">
        <div className="container-max">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mes demandes</h1>
              <p className="text-gray-600">Toutes vos demandes de transport</p>
            </div>
            <Link
              href="/dashboard/client/requests/new"
              className="py-3 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Nouvelle demande
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Chargement…</p>
          ) : requests.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500 mb-4">Vous n&apos;avez pas encore créé de demande.</p>
              <Link href="/dashboard/client/requests/new" className="text-[#E8714D] font-medium hover:underline">
                Créer votre première demande
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <Link
                  key={req.id}
                  href={`/dashboard/client/requests/${req.id}`}
                  className="card-hover flex items-center justify-between block"
                >
                  <div>
                    <p className="font-semibold">
                      {req.materialDescription || "Matériau non précisé"} — {req.quantity} {req.unit}
                    </p>
                    <p className="text-sm text-gray-600">
                      {req.pickupCity} → {req.dropoffCity}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-info text-xs">
                      {REQUEST_STATUS_LABELS[req.status] || req.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{req.quotes.length} devis reçu(s)</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}
