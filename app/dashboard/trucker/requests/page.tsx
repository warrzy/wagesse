"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"

interface TransportRequest {
  id: string
  materialDescription: string | null
  quantity: number
  unit: string
  pickupCity: string
  dropoffCity: string
  requestedDate: string
  urgency: string
  customer: {
    user: { firstName: string | null; lastName: string | null }
  }
}

export default function BrowseRequestsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<TransportRequest[]>([])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
      return
    }

    apiClient.browseTransportRequests({ take: "50" }).then((res) => {
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Demandes disponibles</h1>
            <p className="text-gray-600">Parcourez les demandes publiées et envoyez vos devis</p>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Chargement…</p>
          ) : requests.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">Aucune demande publiée pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <Link
                  key={req.id}
                  href={`/dashboard/trucker/requests/${req.id}`}
                  className="card-hover flex items-center justify-between block"
                >
                  <div>
                    <p className="font-semibold">
                      {req.materialDescription || "Matériau non précisé"} — {req.quantity} {req.unit}
                    </p>
                    <p className="text-sm text-gray-600">
                      {req.pickupCity} → {req.dropoffCity}
                    </p>
                    <p className="text-xs text-gray-500">
                      {req.customer?.user?.firstName} {req.customer?.user?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`badge text-xs ${req.urgency === "STANDARD" ? "badge-info" : "badge-warning"}`}>
                      {req.urgency === "STANDARD" ? "Standard" : req.urgency === "URGENT" ? "Urgent" : "Très urgent"}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(req.requestedDate).toLocaleDateString("fr-FR")}
                    </p>
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
