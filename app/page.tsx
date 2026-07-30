"use client"

import { motion } from "framer-motion"
import { BRAND_CONFIG, MATERIAL_TYPES, TRUCK_TYPES, BF_CITIES } from "@/lib/config"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Link from "next/link"
import { Truck, CheckCircle, Users, Shield, Star } from "lucide-react"

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
    transition: { duration: 0.8, ease: "easeOut" },
  },
}

export default function Home() {
  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen pt-20 pb-12 bg-gradient-to-br from-[#F5F1ED] to-white overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#E8714D] opacity-10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#8B6F47] opacity-10 rounded-full blur-3xl" />
        </div>

        <motion.div
          className="container-max relative z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div variants={itemVariants}>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Trouvez un camion fiable pour votre chantier en quelques minutes
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Publiez votre besoin, recevez des profils de camionneurs vérifiés
                et payez en toute simplicité par Orange Money.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/signup?role=CLIENT"
                  className="px-8 py-4 bg-[#E8714D] text-white rounded-lg font-semibold hover:bg-[#d45c39] transition-colors text-center"
                >
                  Demander un camion
                </Link>
                <Link
                  href="/auth/signup?role=TRUCKER"
                  className="px-8 py-4 border-2 border-[#E8714D] text-[#E8714D] rounded-lg font-semibold hover:bg-[#E8714D] hover:text-white transition-colors text-center"
                >
                  Inscrire mon camion
                </Link>
              </div>
            </motion.div>

            {/* Right Illustration */}
            <motion.div
              variants={itemVariants}
              className="hidden md:flex justify-center"
            >
              <div className="relative w-full max-w-md h-96">
                <div className="absolute inset-0 bg-gradient-to-br from-[#E8714D] to-[#8B6F47] rounded-2xl opacity-20" />
                <Truck size={200} className="absolute inset-0 m-auto text-[#E8714D] opacity-20" />
              </div>
            </motion.div>
          </div>

          {/* Quick Search Form */}
          <motion.div
            variants={itemVariants}
            className="mt-16 bg-white rounded-xl shadow-lg p-6 md:p-8"
          >
            <h3 className="text-xl font-semibold mb-6">Recherche rapide</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Ville de départ"
                className="input-field"
              />
              <input
                type="text"
                placeholder="Destination"
                className="input-field"
              />
              <select className="input-field">
                <option>Sélectionner matériau</option>
                {MATERIAL_TYPES.map((mat) => (
                  <option key={mat.id} value={mat.id}>
                    {mat.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="input-field"
              />
              <button className="px-6 py-3 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors w-full md:w-auto">
                Chercher
              </button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Key Numbers */}
      <section className="py-12 bg-white">
        <motion.div
          className="container-max grid grid-cols-3 md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="text-center">
            <div className="text-4xl font-bold text-[#E8714D] mb-2">500+</div>
            <p className="text-gray-600">Camionneurs vérifiés</p>
          </motion.div>
          <motion.div variants={itemVariants} className="text-center">
            <div className="text-4xl font-bold text-[#E8714D] mb-2">2.5k+</div>
            <p className="text-gray-600">Demandes complétées</p>
          </motion.div>
          <motion.div variants={itemVariants} className="text-center">
            <div className="text-4xl font-bold text-[#E8714D] mb-2">4.8⭐</div>
            <p className="text-gray-600">Note moyenne</p>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="features" className="py-20 bg-gray-50">
        <motion.div
          className="container-max"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-16">
            Comment ça fonctionne
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Décrire votre besoin",
                description:
                  "Indiquez le matériau, la quantité, et les lieux de chargement.",
              },
              {
                step: "2",
                title: "Recevoir des profils",
                description:
                  "Nous trouvons les meilleurs camionneurs pour votre chantier.",
              },
              {
                step: "3",
                title: "Comparer et choisir",
                description: "Consultez les tarifs et les avis, puis sélectionnez.",
              },
              {
                step: "4",
                title: "Payer et suivre",
                description:
                  "Paiement sécurisé et suivi en temps réel du camion.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-white rounded-lg p-6 shadow-sm"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#E8714D] text-white font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Materials Section */}
      <section id="materials" className="py-20 bg-white">
        <motion.div
          className="container-max"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-16">
            Matériaux transportés
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {MATERIAL_TYPES.map((material, index) => (
              <motion.div
                key={material.id}
                variants={itemVariants}
                className="card-hover flex flex-col items-center justify-center py-8 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-[#E8714D] bg-opacity-10 flex items-center justify-center mb-4">
                  <Truck size={32} className="text-[#E8714D]" />
                </div>
                <h3 className="font-semibold text-center">{material.name}</h3>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Truck Types */}
      <section className="py-20 bg-gray-50">
        <motion.div
          className="container-max"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-16">
            Types de camions disponibles
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {TRUCK_TYPES.map((truck, index) => (
              <motion.div
                key={truck.id}
                variants={itemVariants}
                className="card"
              >
                <h3 className="text-lg font-semibold mb-4">{truck.name}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <strong>Min:</strong> {truck.minCapacity} tonnes
                  </p>
                  <p>
                    <strong>Max:</strong> {truck.maxCapacity} tonnes
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Services */}
      <section className="py-20 bg-white">
        <motion.div
          className="container-max"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-16">
            Nos avantages
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: <Shield size={32} />,
                title: "Vérification rigoureuse",
                description:
                  "Tous les camionneurs et documents sont vérifiés avant activation.",
              },
              {
                icon: <Users size={32} />,
                title: "Support local 24/7",
                description:
                  "Siège au Burkina Faso pour vous assister en français.",
              },
              {
                icon: <CheckCircle size={32} />,
                title: "Paiements sécurisés",
                description:
                  "Versement au camionneur seulement après livraison confirmée.",
              },
              {
                icon: <Star size={32} />,
                title: "Notes et avis",
                description:
                  "Système de notation transparent et indépendant.",
              },
            ].map((service, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="card-hover flex gap-6"
              >
                <div className="shrink-0 text-[#E8714D]">{service.icon}</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                  <p className="text-gray-600">{service.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#2C3E50] text-white">
        <motion.div
          className="container-max text-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl font-bold mb-6">
            Prêt à démarrer ?
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            Rejoignez des centaines de clients et camionneurs qui utilisent
            {BRAND_CONFIG.name} pour leurs besoins de transport.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/auth/signup?role=CLIENT"
              className="px-8 py-4 bg-[#E8714D] text-white rounded-lg font-semibold hover:bg-[#d45c39] transition-colors"
            >
              Demander un camion
            </Link>
            <Link
              href="/auth/signup?role=TRUCKER"
              className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-[#2C3E50] transition-colors"
            >
              Devenir camionneur
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </>
  )
}
