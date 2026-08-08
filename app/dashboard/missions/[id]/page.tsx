"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"
import { MISSION_STATUS_LABELS } from "@/lib/config"

const TRUCKER_FLOW = [
  "ACCEPTED",
  "TRUCK_EN_ROUTE_PICKUP",
  "ARRIVED_PICKUP",
  "LOADING_IN_PROGRESS",
  "EN_ROUTE_DELIVERY",
  "ARRIVED_DELIVERY",
  "DELIVERED",
]

const CLIENT_FLOW = ["PENDING_CONFIRMATION", "COMPLETED"]

function nextStatus(current: string, role: "CLIENT" | "TRUCKER") {
  if (role === "TRUCKER") {
    const idx = TRUCKER_FLOW.indexOf(current)
    if (idx >= 0 && idx < TRUCKER_FLOW.length - 1) return TRUCKER_FLOW[idx + 1]
    if (current === "DELIVERED") return "PENDING_CONFIRMATION"
    return null
  }
  const idx = CLIENT_FLOW.indexOf(current)
  if (idx >= 0 && idx < CLIENT_FLOW.length - 1) return CLIENT_FLOW[idx + 1]
  return null
}

interface Mission {
  id: string
  missionReference: string
  contractMaterial: string | null
  contractQuantity: number | null
  contractUnit: string | null
  contractPrice: number
  pickupLocation: string
  dropoffLocation: string
  status: string
  scheduledDate: string
  customer: { user: { firstName: string | null; lastName: string | null; phone: string } }
  trucker: { user: { firstName: string | null; lastName: string | null; phone: string } }
  vehicle: { licensePlate: string; brand: string; model: string } | null
  statusHistory: { previousStatus: string | null; newStatus: string; timestamp: string }[]
}

export default function MissionDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mission, setMission] = useState<Mission | null>(null)
  const [role, setRole] = useState<"CLIENT" | "TRUCKER" | null>(null)

  const load = useCallback(async () => {
    const [meRes, missionRes] = await Promise.all([
      apiClient.getCurrentUser(),
      apiClient.getMission(params.id),
    ])
    if (meRes.success) setRole((meRes.data as any)?.role === "TRUCKER" ? "TRUCKER" : "CLIENT")
    if (missionRes.success) setMission(missionRes.data as any)
    else setError(missionRes.error || "Mission introuvable")
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

  const handleAdvance = async () => {
    if (!mission || !role) return
    const next = nextStatus(mission.status, role)
    if (!next) return
    setUpdating(true)
    const res = await apiClient.updateMissionStatus(mission.id, next)
    if (!res.success) setError(res.error || "Erreur lors de la mise à jour")
    await load()
    setUpdating(false)
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

  if (!mission) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-8 pb-12">
          <div className="container-max">
            <p className="text-red-600">{error || "Mission introuvable"}</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const next = role ? nextStatus(mission.status, role) : null
  const isTerminal = ["COMPLETED", "CANCELLED", "REFUNDED"].includes(mission.status)

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gray-50 pt-8 pb-12">
        <div className="container-max max-w-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="card mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">{mission.missionReference}</h1>
                <p className="text-gray-600">
                  {mission.contractMaterial || "Matériau non précisé"}
                  {mission.contractQuantity ? ` • ${mission.contractQuantity} ${mission.contractUnit || ""}` : ""}
                </p>
              </div>
              <span className="badge badge-info">{MISSION_STATUS_LABELS[mission.status] || mission.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-500">Départ</p>
                <p className="font-medium">{mission.pickupLocation}</p>
              </div>
              <div>
                <p className="text-gray-500">Destination</p>
                <p className="font-medium">{mission.dropoffLocation}</p>
              </div>
              <div>
                <p className="text-gray-500">Client</p>
                <p className="font-medium">
                  {mission.customer.user.firstName} {mission.customer.user.lastName} — {mission.customer.user.phone}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Camionneur</p>
                <p className="font-medium">
                  {mission.trucker.user.firstName} {mission.trucker.user.lastName} — {mission.trucker.user.phone}
                </p>
              </div>
              {mission.vehicle && (
                <div>
                  <p className="text-gray-500">Véhicule</p>
                  <p className="font-medium">
                    {mission.vehicle.brand} {mission.vehicle.model} ({mission.vehicle.licensePlate})
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Prix</p>
                <p className="font-bold text-[#E8714D]">{mission.contractPrice.toLocaleString("fr-FR")} Fr</p>
              </div>
            </div>

            {!isTerminal && next && (
              <button
                onClick={handleAdvance}
                disabled={updating}
                className="w-full py-3 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors disabled:opacity-50"
              >
                {updating ? "Mise à jour…" : `Marquer : ${MISSION_STATUS_LABELS[next] || next}`}
              </button>
            )}

            {!isTerminal && !next && (
              <p className="text-sm text-gray-500">En attente d&apos;action de l&apos;autre partie.</p>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Historique</h2>
            {mission.statusHistory.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun changement de statut pour le moment.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {mission.statusHistory.map((h, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <p>
                      {h.previousStatus ? `${MISSION_STATUS_LABELS[h.previousStatus] || h.previousStatus} → ` : ""}
                      {MISSION_STATUS_LABELS[h.newStatus] || h.newStatus}
                    </p>
                    <p className="text-gray-500">{new Date(h.timestamp).toLocaleString("fr-FR")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
