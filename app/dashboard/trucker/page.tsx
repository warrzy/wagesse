"use client"

import { motion } from "framer-motion"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Truck, DollarSign, CheckCircle, AlertCircle, TrendingUp } from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
}

export default function TruckerDashboard() {
  return (
    <>
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

          {/* Stats Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
            variants={containerVariants}
          >
            {[
              {
                icon: <Truck size={24} />,
                label: "Missions ce mois",
                value: "12",
                trend: "+3",
              },
              {
                icon: <DollarSign size={24} />,
                label: "Revenus ce mois",
                value: "450 000 Fr",
                trend: "+15%",
              },
              {
                icon: <CheckCircle size={24} />,
                label: "Taux de réalisation",
                value: "98%",
                trend: "stable",
              },
              {
                icon: <TrendingUp size={24} />,
                label: "À recevoir",
                value: "125 000 Fr",
                trend: "+2",
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="card-hover flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[#E8714D]">{stat.icon}</div>
                  <span className="text-xs font-medium text-green-600">
                    {stat.trend}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Content Grid */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            variants={containerVariants}
          >
            {/* Active Missions */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 card"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Missions à faire</h2>
                <span className="badge badge-success">2 urgentes</span>
              </div>

              <div className="space-y-4">
                {[
                  {
                    ref: "MISS-001",
                    client: "BTP Ouagadougou",
                    material: "Sable blanc",
                    qty: "20 tonnes",
                    pickup: "Zone 1, Ouaga",
                    dropoff: "Chantier Gado-Ouaga",
                    price: "35 000 Fr",
                    status: "ACCEPTED",
                    date: "Aujourd'hui",
                  },
                  {
                    ref: "MISS-002",
                    client: "Carrière Nationale",
                    material: "Granite 0/20",
                    qty: "50 tonnes",
                    pickup: "Carrière de Gado",
                    dropoff: "Barrage Ziga",
                    price: "85 000 Fr",
                    status: "PENDING_ACCEPTANCE",
                    date: "Demain",
                  },
                ].map((mission, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg hover:border-[#E8714D] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{mission.client}</p>
                        <p className="text-sm text-gray-600">
                          {mission.material} • {mission.qty}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#E8714D]">{mission.price}</p>
                        <span className={`badge text-xs ${
                          mission.status === "ACCEPTED"
                            ? "badge-success"
                            : "badge-warning"
                        }`}>
                          {mission.status === "ACCEPTED" ? "Acceptée" : "En attente"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                      <p>📍 {mission.pickup}</p>
                      <p>📍 {mission.dropoff}</p>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <p>{mission.date}</p>
                      <button className="text-[#E8714D] font-medium hover:underline">
                        Détails
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              variants={itemVariants}
              className="card"
            >
              <h2 className="text-xl font-semibold mb-6">Mes véhicules</h2>

              <div className="space-y-3 mb-6">
                {[
                  { plate: "BF 001 LM", capacity: "20 tonnes", status: "Disponible" },
                  { plate: "BF 002 LM", capacity: "25 tonnes", status: "En mission" },
                ].map((vehicle, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-semibold text-sm">{vehicle.plate}</p>
                    <p className="text-xs text-gray-600">{vehicle.capacity}</p>
                    <span className={`badge text-xs mt-1 ${
                      vehicle.status === "Disponible"
                        ? "badge-success"
                        : "badge-warning"
                    }`}>
                      {vehicle.status}
                    </span>
                  </div>
                ))}
              </div>

              <hr className="my-6" />

              <div className="space-y-3">
                <button className="w-full py-3 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors">
                  Accepter mission
                </button>

                <button className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-[#E8714D] transition-colors">
                  Mes documents
                </button>
              </div>

              {/* Alerts */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-orange-500" />
                  Rappels
                </p>

                <div className="text-xs space-y-2">
                  <p className="text-orange-600">
                    ⚠️ Assurance expire dans 15 jours
                  </p>
                  <p className="text-orange-600">
                    ⚠️ Visite technique à renouveler
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </>
  )
}
