"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, Variants } from "framer-motion"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import CreditsBanner from "@/components/CreditsBanner"
import ClientGuard from "@/app/dashboard/client/client-guard"
import { Truck, MapPin, DollarSign, Star, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { MISSION_STATUS_LABELS, REQUEST_STATUS_LABELS } from "@/lib/config"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
}

interface Mission {
  id: string
  missionReference: string
  contractMaterial: string | null
  contractQuantity: number | null
  contractUnit: string | null
  status: string
  scheduledDate: string
  trucker: { user: { firstName: string | null; lastName: string | null } }
}

interface TransportRequest {
  id: string
  materialDescription: string | null
  status: string
  pickupCity: string
  dropoffCity: string
  createdAt: string
  quotes: { id: string }[]
}

export default function ClientDashboard() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [missions, setMissions] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [subscription, setSubscription] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
      return
    }

    const load = async () => {
      const [missionsRes, requestsRes] = await Promise.all([
        apiClient.getMissions({ take: "10" }),
        apiClient.getTransportRequests({ take: "10" }),
      ])

      const creditsRes = await apiClient.getCreditBalance()
      if (creditsRes.success) {
        const data = creditsRes.data as any
        setCreditBalance(typeof data?.balance === "number" ? data.balance : null)
      }

      if (missionsRes.success) {
        setMissions((missionsRes.data as any)?.missions || [])
      }
      if (requestsRes.success) {
        setRequests((requestsRes.data as any)?.requests || [])
      }
      setLoading(false)
    }

    load()
  }, [router])

  useEffect(() => {
    const loadSub = async () => {
      const res = await apiClient.getCurrentSubscription()
      if (res.success) setSubscription((res.data as any) || null)
    }
    loadSub()
  }, [])

  const activeMissions = missions.filter(
    (m) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(m.status)
  )
  const publishedRequests = requests.filter((r) => r.status !== "DRAFT")

  return (
    <ClientGuard>
      <Header />

      <div className="min-h-screen bg-gray-50 pt-8 pb-12">
        <motion.div
          className="container-max"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Tableau de bord client</h1>
            <p className="text-gray-600">Gérez vos demandes et missions</p>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8">
            <CreditsBanner dashboardHref="/dashboard/client" contactsHref="/dashboard/client/contacts" />
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Plan actuel</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {subscription?.plan?.code ? subscription.plan.code : "FREE"}
                    {subscription?.nextPaymentDate
                      ? ` • Renouvellement le ${new Date(subscription.nextPaymentDate).toLocaleDateString("fr-FR")}`
                      : ""}
                  </p>
                </div>
                <Link href="/abonnement" className="text-sm font-semibold text-[#E8714D] hover:underline">
                  Gérer mon abonnement
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
            variants={containerVariants}
          >
            {[
              {
                icon: <Truck size={24} />,
                label: "Missions actives",
                value: loading ? "…" : String(activeMissions.length),
              },
              {
                icon: <MapPin size={24} />,
                label: "Demandes publiées",
                value: loading ? "…" : String(publishedRequests.length),
              },
              {
                icon: <DollarSign size={24} />,
                label: "Missions terminées",
                value: loading ? "…" : String(missions.filter((m) => m.status === "COMPLETED").length),
              },
              {
                icon: <Star size={24} />,
                label: "Total missions",
                value: loading ? "…" : String(missions.length),
              },
            ].map((stat, index) => (
              <motion.div key={index} variants={itemVariants} className="card-hover flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[#E8714D]">{stat.icon}</div>
                </div>
                <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Content Grid */}
          <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-8" variants={containerVariants}>
            {/* Active Missions */}
            <motion.div variants={itemVariants} className="lg:col-span-2 card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Missions en cours</h2>
                <span className="badge badge-success">{activeMissions.length} active(s)</span>
              </div>

              {loading ? (
                <p className="text-sm text-gray-500">Chargement…</p>
              ) : activeMissions.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune mission active pour le moment.</p>
              ) : (
                <div className="space-y-4">
                  {activeMissions.map((mission) => (
                    <Link
                      key={mission.id}
                      href={`/dashboard/missions/${mission.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-[#E8714D] transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{mission.missionReference}</p>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {mission.contractMaterial || "Matériau non précisé"}
                            {mission.contractQuantity ? ` • ${mission.contractQuantity} ${mission.contractUnit || ""}` : ""}
                          </p>
                        </div>
                        <span className="badge badge-info text-xs">
                          {MISSION_STATUS_LABELS[mission.status] || mission.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <p>
                          {mission.trucker?.user?.firstName} {mission.trucker?.user?.lastName}
                        </p>
                        <p>{new Date(mission.scheduledDate).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants} className="card">
              <h2 className="text-xl font-semibold mb-6">Actions rapides</h2>

              <div className="space-y-3">
                <Link
                  href="/dashboard/client/requests/new"
                  className="w-full py-3 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors flex items-center justify-center gap-2"
                >
                  <Truck size={18} />
                  Nouvelle demande
                </Link>

                <Link
                  href="/dashboard/client/requests"
                  className="w-full py-3 px-4 border-2 border-[#E8714D] text-[#E8714D] rounded-lg font-medium hover:bg-[#E8714D] hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin size={18} />
                  Mes demandes
                </Link>

                <Link
                  href="/dashboard/client/contacts"
                  className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-[#E8714D] transition-colors flex items-center justify-center gap-2"
                >
                  Mes contacts
                </Link>

                <Link
                  href="/dashboard/commandes"
                  className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-[#E8714D] transition-colors flex items-center justify-center gap-2"
                >
                  Mes commandes
                </Link>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold mb-3">Mes crédits</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{creditBalance === null ? "…" : String(creditBalance)}</p>
                  <Link
                    href="/pricing"
                    className="text-sm font-semibold text-[#E8714D] hover:underline"
                  >
                    Acheter des crédits
                  </Link>
                </div>
                <p className="mt-2 text-xs text-gray-500">1 crédit = 1 contact débloqué</p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-orange-500" />
                  Alertes
                </p>
                <div className="text-xs space-y-2 text-gray-500">
                  <p>Aucune alerte pour le moment.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Recent Requests */}
          <motion.div variants={itemVariants} className="card mt-8">
            <h2 className="text-xl font-semibold mb-6">Demandes récentes</h2>

            {loading ? (
              <p className="text-sm text-gray-500">Chargement…</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-gray-500">Vous n&apos;avez pas encore créé de demande.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {requests.slice(0, 5).map((req) => (
                  <div key={req.id} className="py-2 border-b border-gray-100 last:border-0 flex justify-between">
                    <p className="text-gray-700">
                      {req.materialDescription || "Matériau non précisé"} — {req.pickupCity} → {req.dropoffCity}
                    </p>
                    <span className="badge text-xs">{REQUEST_STATUS_LABELS[req.status] || req.status}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </ClientGuard>
  )
}
