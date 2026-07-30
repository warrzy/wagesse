"use client"

import { motion } from "framer-motion"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Truck, MapPin, DollarSign, Star, Clock, AlertCircle } from "lucide-react"

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

export default function ClientDashboard() {
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
            <h1 className="text-3xl font-bold mb-2">Tableau de bord client</h1>
            <p className="text-gray-600">Gérez vos demandes et missions</p>
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
                value: "3",
                trend: "+2",
              },
              {
                icon: <MapPin size={24} />,
                label: "Demandes publiées",
                value: "8",
                trend: "+1",
              },
              {
                icon: <DollarSign size={24} />,
                label: "Dépenses ce mois",
                value: "125 000 Fr",
                trend: "-5%",
              },
              {
                icon: <Star size={24} />,
                label: "Note moyenne",
                value: "4.8",
                trend: "0",
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
            {/* Active Requests */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 card"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Missions en cours</h2>
                <span className="badge badge-success">3 actives</span>
              </div>

              <div className="space-y-4">
                {[
                  {
                    ref: "MISS-001",
                    material: "Sable blanc",
                    qty: "50 tonnes",
                    status: "EN_ROUTE_DELIVERY",
                    trucker: "Koidibo Transport",
                    date: "Aujourd'hui",
                  },
                  {
                    ref: "MISS-002",
                    material: "Gravier concassé",
                    qty: "30 tonnes",
                    status: "LOADING_IN_PROGRESS",
                    trucker: "Ali Mahraoui",
                    date: "Demain",
                  },
                  {
                    ref: "MISS-003",
                    material: "Granite",
                    qty: "25 tonnes",
                    status: "ACCEPTED",
                    trucker: "Oxalis & Co",
                    date: "Jeudi",
                  },
                ].map((mission, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg hover:border-[#E8714D] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{mission.ref}</p>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {mission.material} • {mission.qty}
                        </p>
                      </div>
                      <span className="badge badge-info text-xs">
                        {mission.status === "EN_ROUTE_DELIVERY"
                          ? "En route"
                          : mission.status === "LOADING_IN_PROGRESS"
                          ? "Chargement"
                          : "Acceptée"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <p>{mission.trucker}</p>
                      <p>{mission.date}</p>
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
              <h2 className="text-xl font-semibold mb-6">Actions rapides</h2>

              <div className="space-y-3">
                <button className="w-full py-3 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors flex items-center justify-center gap-2">
                  <Truck size={18} />
                  Nouvelle demande
                </button>

                <button className="w-full py-3 px-4 border-2 border-[#E8714D] text-[#E8714D] rounded-lg font-medium hover:bg-[#E8714D] hover:text-white transition-colors flex items-center justify-center gap-2">
                  <MapPin size={18} />
                  Mes camions
                </button>

                <button className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-[#E8714D] transition-colors flex items-center justify-center gap-2">
                  <Clock size={18} />
                  Historique
                </button>
              </div>

              {/* Alerts */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-orange-500" />
                  Alertes
                </p>

                <div className="text-xs space-y-2">
                  <p className="text-orange-600">
                    ⚠️ Document d&apos;identité à renouveler (expire dans 30 jours)
                  </p>
                  <p className="text-green-600">
                    ✓ Dernier paiement confirmé
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            variants={itemVariants}
            className="card mt-8"
          >
            <h2 className="text-xl font-semibold mb-6">Activité récente</h2>

            <div className="space-y-3 text-sm">
              {[
                "Mission MISS-001 passée au statut 'En route vers livraison' - 10 min",
                "Paiement de 50 000 Fr confirmé - 2h",
                "Nouvelle proposition reçue de Ali Mahraoui - 5h",
                "Demande DEMANDE-005 publiée - 1j",
              ].map((activity, index) => (
                <div key={index} className="py-2 border-b border-gray-100 last:border-0">
                  <p className="text-gray-600">{activity}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </>
  )
}
