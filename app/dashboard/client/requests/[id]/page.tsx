"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"
import { REQUEST_STATUS_LABELS } from "@/lib/config"
import { Lock } from "lucide-react"

interface LockedQuote {
  id: string
  status: string
  createdAt: string
  locked: true
}

interface UnlockedQuote {
  id: string
  totalPrice: number
  proposedDate: string
  validUntil: string
  comments: string | null
  status: string
  createdAt: string
  locked: false
  trucker: {
    averageRating: number
    acceptanceRate: number
    user: { firstName: string | null; lastName: string | null; phone: string }
  }
  vehicle: { licensePlate: string; brand: string; model: string; capacityTonnes: number } | null
}

type Quote = LockedQuote | UnlockedQuote

interface RequestDetail {
  id: string
  materialDescription: string | null
  quantity: number
  unit: string
  pickupCity: string
  dropoffCity: string
  status: string
  notes: string | null
  quotes: Quote[]
  contactsUnlocked: boolean
}

export default function ClientRequestDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState<RequestDetail | null>(null)

  const load = useCallback(async () => {
    const res = await apiClient.getTransportRequest(params.id)
    if (res.success) {
      setRequest(res.data as any)
    } else {
      setError(res.error || "Demande introuvable")
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
      return
    }
    load()
  }, [router, load])

  const handlePublish = async () => {
    setActionLoading(true)
    const res = await apiClient.publishTransportRequest(params.id)
    if (!res.success) setError(res.error || "Erreur")
    await load()
    setActionLoading(false)
  }

  const handleAccept = async (quoteId: string) => {
    setActionLoading(true)
    const res = await apiClient.acceptQuote(quoteId)
    if (!res.success) {
      setError(res.error || "Erreur lors de l'acceptation")
      setActionLoading(false)
      return
    }
    router.push("/dashboard/client")
  }

  const handleReject = async (quoteId: string) => {
    setActionLoading(true)
    const res = await apiClient.rejectQuote(quoteId)
    if (!res.success) setError(res.error || "Erreur")
    await load()
    setActionLoading(false)
  }

  const handleUnlockQuotes = async () => {
    setActionLoading(true)
    const res = await apiClient.unlockRequestContacts(params.id)
    if (!res.success) {
      if (res.code === "INSUFFICIENT_CREDITS") {
        setError("Vous n'avez plus suffisamment de crédits. Achetez des crédits pour accéder à ce contact.")
      } else {
        setError(res.error || "Erreur lors du déblocage")
      }
      setActionLoading(false)
      return
    }

    await load()
    setActionLoading(false)
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-8 pb-12">
          <div className="container-max">
            <p className="text-sm text-gray-500">Chargement…</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!request) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-8 pb-12">
          <div className="container-max">
            <p className="text-red-600">{error || "Demande introuvable"}</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gray-50 pt-8 pb-12">
        <div className="container-max max-w-3xl">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
              {error.includes("crédits") && (
                <div className="mt-3">
                  <Link href="/pricing" className="font-semibold underline">
                    Acheter des crédits
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="card mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">
                  {request.materialDescription || "Matériau non précisé"} — {request.quantity} {request.unit}
                </h1>
                <p className="text-gray-600">{request.pickupCity} → {request.dropoffCity}</p>
              </div>
              <span className="badge badge-info">{REQUEST_STATUS_LABELS[request.status] || request.status}</span>
            </div>

            {request.notes && <p className="text-sm text-gray-600 mb-4">{request.notes}</p>}

            {request.status === "DRAFT" && (
              <button
                onClick={handlePublish}
                disabled={actionLoading}
                className="py-2 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors disabled:opacity-50"
              >
                Publier la demande
              </button>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Devis reçus ({request.quotes.length})</h2>
              {request.quotes.length > 0 && !request.contactsUnlocked && (
                <button
                  onClick={handleUnlockQuotes}
                  disabled={actionLoading}
                  className="py-2 px-3 bg-[#8B6F47] text-white rounded-lg text-sm font-medium hover:bg-[#7a5f3d] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Lock size={14} />
                  Débloquer les devis (1 crédit)
                </button>
              )}
            </div>

            {request.quotes.length === 0 ? (
              <p className="text-sm text-gray-500">
                {request.status === "DRAFT"
                  ? "Publiez votre demande pour recevoir des devis."
                  : "Aucun devis reçu pour le moment."}
              </p>
            ) : !request.contactsUnlocked ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  {request.quotes.length} camionneur(s) ont proposé un devis. Payez les frais de déblocage pour
                  consulter le prix, le camionneur et le véhicule proposés.
                </p>
                {request.quotes.map((quote) => (
                  <div key={quote.id} className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Lock size={14} />
                      Devis reçu le {new Date(quote.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                    <span className="badge text-xs">{quote.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {request.quotes.map((quote) => {
                  if (quote.locked) return null
                  return (
                    <div key={quote.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">
                            {quote.trucker.user.firstName} {quote.trucker.user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Note: {quote.trucker.averageRating.toFixed(1)}/5 • Taux d&apos;acceptation: {quote.trucker.acceptanceRate}%
                          </p>
                          <p className="text-xs text-gray-500">{quote.trucker.user.phone}</p>
                          {quote.vehicle && (
                            <p className="text-xs text-gray-500">
                              {quote.vehicle.brand} {quote.vehicle.model} ({quote.vehicle.licensePlate}) — {quote.vehicle.capacityTonnes}t
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#E8714D]">{quote.totalPrice.toLocaleString("fr-FR")} Fr</p>
                          <span className="badge text-xs">{quote.status}</span>
                        </div>
                      </div>

                      {quote.comments && <p className="text-sm text-gray-600 mb-2">{quote.comments}</p>}

                      {quote.status === "PENDING" && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAccept(quote.id)}
                            disabled={actionLoading}
                            className="flex-1 py-2 px-3 bg-[#E8714D] text-white rounded-lg text-sm font-medium hover:bg-[#d45c39] transition-colors disabled:opacity-50"
                          >
                            Accepter
                          </button>
                          <button
                            onClick={() => handleReject(quote.id)}
                            disabled={actionLoading}
                            className="flex-1 py-2 px-3 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:border-[#E8714D] transition-colors disabled:opacity-50"
                          >
                            Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
