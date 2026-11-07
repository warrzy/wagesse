"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, Variants } from "framer-motion"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import CreditsBanner from "@/components/CreditsBanner"
import PhoneNotice from "@/components/PhoneNotice"
import ClientGuard from "@/app/dashboard/client/client-guard"
import { Truck, DollarSign, CheckCircle, AlertCircle, TrendingUp } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { MISSION_STATUS_LABELS } from "@/lib/config"

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
  contractPrice: number
  pickupLocation: string
  dropoffLocation: string
  status: string
  scheduledDate: string
  customer: { user: { firstName: string | null; lastName: string | null } }
}

interface Vehicle {
  id: string
  licensePlate: string
  capacityTonnes: number
  isOperational: boolean
}

export default function TruckerDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missions, setMissions] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [subscription, setSubscription] = useState<any | null>(null)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
      return
    }

    const load = async () => {
      const [missionsRes, vehiclesRes] = await Promise.all([
        apiClient.getMissions({ take: "10" }),
        apiClient.getVehicles(),
      ])

      const creditsRes = await apiClient.getCreditBalance()
      if (creditsRes.success) {
        const data = creditsRes.data as any
        setCreditBalance(typeof data?.balance === "number" ? data.balance : null)
      }

      if (missionsRes.success) {
        setMissions((missionsRes.data as any)?.missions || [])
      }
      if (vehiclesRes.success) {
        setVehicles((vehiclesRes.data as Vehicle[]) || [])
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
  const completedMissions = missions.filter((m) => m.status === "COMPLETED")
  const totalRevenue = completedMissions.reduce((sum, m) => sum + m.contractPrice, 0)

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
            <h1 className="text-3xl font-bold mb-2">Tableau de bord camionneur</h1>
            <p className="text-gray-600">Gérez vos missions et revenus</p>
          </motion.div>

          <PhoneNotice />

          <motion.div variants={itemVariants} className="mb-8">
            <CreditsBanner dashboardHref="/dashboard/trucker" contactsHref="/dashboard/trucker/contacts" />
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
                icon: <DollarSign size={24} />,
                label: "Revenus (missions terminées)",
                value: loading ? "…" : `${totalRevenue.toLocaleString("fr-FR")} Fr`,
              },
              {
                icon: <CheckCircle size={24} />,
                label: "Missions terminées",
                value: loading ? "…" : String(completedMissions.length),
              },
              {
                icon: <TrendingUp size={24} />,
                label: "Véhicules actifs",
                value: loading ? "…" : String(vehicles.filter((v) => v.isOperational).length),
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
                <h2 className="text-xl font-semibold">Missions à faire</h2>
                <span className="badge badge-success">{activeMissions.length} en cours</span>
              </div>

              {loading ? (
                <p className="text-sm text-gray-500">Chargement…</p>
              ) : activeMissions.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune mission en cours. Consultez les demandes publiées pour envoyer un devis.</p>
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
                          <p className="font-semibold">
                            {mission.customer?.user?.firstName} {mission.customer?.user?.lastName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {mission.contractMaterial || "Matériau non précisé"}
                            {mission.contractQuantity ? ` • ${mission.contractQuantity} ${mission.contractUnit || ""}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#E8714D]">
                            {mission.contractPrice.toLocaleString("fr-FR")} Fr
                          </p>
                          <span className="badge badge-info text-xs">
                            {MISSION_STATUS_LABELS[mission.status] || mission.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                        <p>📍 {mission.pickupLocation}</p>
                        <p>📍 {mission.dropoffLocation}</p>
                      </div>

                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <p>{new Date(mission.scheduledDate).toLocaleDateString("fr-FR")}</p>
                        <span className="text-[#E8714D] font-medium">Détails →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Vehicles */}
            <motion.div variants={itemVariants} className="card">
              <h2 className="text-xl font-semibold mb-6">Mes véhicules</h2>

              {loading ? (
                <p className="text-sm text-gray-500 mb-6">Chargement…</p>
              ) : vehicles.length === 0 ? (
                <p className="text-sm text-gray-500 mb-6">Aucun véhicule enregistré.</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-sm">{vehicle.licensePlate}</p>
                      <p className="text-xs text-gray-600">{vehicle.capacityTonnes} tonnes</p>
                      <span className={`badge text-xs mt-1 ${vehicle.isOperational ? "badge-success" : "badge-warning"}`}>
                        {vehicle.isOperational ? "Disponible" : "Indisponible"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <hr className="my-6" />

              <div className="space-y-3">
                <Link
                  href="/dashboard/trucker/requests"
                  className="w-full py-3 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors flex items-center justify-center"
                >
                  Trouver des demandes
                </Link>

                <Link
                  href="/dashboard/trucker/vehicles"
                  className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-[#E8714D] transition-colors flex items-center justify-center"
                >
                  Gérer mes véhicules
                </Link>

                <Link
                  href="/dashboard/trucker/contacts"
                  className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-[#E8714D] transition-colors flex items-center justify-center"
                >
                  Mes contacts
                </Link>

                <Link
                  href="/dashboard/commandes"
                  className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-[#E8714D] transition-colors flex items-center justify-center"
                >
                  Mes commandes
                </Link>

                <Link
                  href="/dashboard/trucker/profil"
                  className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-[#E8714D] transition-colors flex items-center justify-center"
                >
                  Mon profil
                </Link>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold mb-3">Mes crédits</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{creditBalance === null ? "…" : String(creditBalance)}</p>
                  <Link href="/pricing" className="text-sm font-semibold text-[#E8714D] hover:underline">
                    Acheter des crédits
                  </Link>
                </div>
                <p className="mt-2 text-xs text-gray-500">1 crédit = 1 contact débloqué</p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-orange-500" />
                  Rappels
                </p>
                <div className="text-xs space-y-2 text-gray-500">
                  <p>Aucun rappel pour le moment.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </ClientGuard>
  )
}
