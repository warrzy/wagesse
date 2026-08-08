"use client"

import { motion, Variants } from "framer-motion"
import { MATERIAL_TYPES, TRUCK_TYPES } from "@/lib/config"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Hero from "@/components/Hero"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Clipboard,
  CreditCard,
  MapPinned,
  Scale,
  Shield,
  Star,
  Truck,
  Users,
} from "lucide-react"

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
    transition: { duration: 0.7, ease: "easeOut" },
  },
}

export default function Home() {
  return (
    <>
      <Header />

      <Hero clientCtaHref="/auth/signup?role=CLIENT" truckerCtaHref="/auth/signup?role=TRUCKER" />

      {/* How It Works */}
      <section id="features" className="py-20 bg-gray-50">
        <motion.div
          className="container-max"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#0F172A]">Comment ça fonctionne</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Un parcours simple et rassurant: décrivez le besoin, comparez, payez, suivez la livraison.
            </p>
          </motion.div>

          <div className="hidden lg:block">
            <div className="grid grid-cols-5 gap-4 items-stretch">
              {[
                { icon: <Clipboard size={22} />, title: "Décrire le besoin", desc: "Matériau, quantité, départ, destination." },
                { icon: <Truck size={22} />, title: "Recevoir plusieurs offres", desc: "Des camionneurs répondent rapidement." },
                { icon: <Scale size={22} />, title: "Comparer", desc: "Prix, disponibilité, avis." },
                { icon: <CreditCard size={22} />, title: "Payer", desc: "Paiement sécurisé et simple." },
                { icon: <MapPinned size={22} />, title: "Livraison", desc: "Suivi et validation à l'arrivée." },
              ].map((s, idx) => (
                <motion.div
                  key={s.title}
                  variants={itemVariants}
                  className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  {idx > 0 && (
                    <div className="absolute -left-2 top-1/2 h-[2px] w-4 bg-gradient-to-r from-[#F97316] to-transparent" />
                  )}
                  <div className="h-11 w-11 rounded-2xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center">
                    {s.icon}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#0F172A]">{s.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
            {[
              { icon: <Clipboard size={22} />, title: "Décrire le besoin", desc: "Matériau, quantité, départ, destination." },
              { icon: <Truck size={22} />, title: "Recevoir plusieurs offres", desc: "Des camionneurs répondent rapidement." },
              { icon: <Scale size={22} />, title: "Comparer", desc: "Prix, disponibilité, avis." },
              { icon: <CreditCard size={22} />, title: "Payer", desc: "Paiement sécurisé et simple." },
              { icon: <MapPinned size={22} />, title: "Livraison", desc: "Suivi et validation à l'arrivée." },
            ].map((s) => (
              <motion.div
                key={s.title}
                variants={itemVariants}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center">
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{s.title}</p>
                    <p className="text-sm text-gray-600">{s.desc}</p>
                  </div>
                </div>
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
          <motion.div variants={itemVariants} className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#0F172A]">Matériaux</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Les matériaux les plus demandés, avec des camions adaptés à chaque type de chargement.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {MATERIAL_TYPES.slice(0, 8).map((material) => (
              <motion.div
                key={material.id}
                variants={itemVariants}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                <div className="h-12 w-12 rounded-2xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[#0F172A]">{material.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Disponible selon zones</p>
                </div>
                <div className="mt-4 h-16 rounded-xl border border-gray-200 bg-gradient-to-br from-[#F8FAFC] to-white" />
                <div className="mt-4 text-xs text-[#F97316] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Voir les options
                </div>
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
          <motion.div variants={itemVariants} className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#0F172A]">Types de camions</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Choisis le bon camion selon la charge, la distance et le terrain.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TRUCK_TYPES.map((truck) => (
              <motion.div
                key={truck.id}
                variants={itemVariants}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="h-40 rounded-2xl border border-gray-200 bg-gradient-to-br from-[#F8FAFC] to-white" />
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#0F172A]">{truck.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">Capacité: {truck.minCapacity}–{truck.maxCapacity} t</p>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center">
                    <Truck size={18} />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] px-3 py-2">
                    <p className="text-xs text-gray-500">Min</p>
                    <p className="font-semibold text-[#0F172A]">{truck.minCapacity} t</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] px-3 py-2">
                    <p className="text-xs text-gray-500">Max</p>
                    <p className="font-semibold text-[#0F172A]">{truck.maxCapacity} t</p>
                  </div>
                </div>

                <div className="mt-6">
                  <Link href="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-[#F97316] hover:underline">
                    Voir les tarifs
                    <ArrowRight size={16} />
                  </Link>
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
          <motion.div variants={itemVariants} className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#0F172A]">Avantages</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Une expérience premium: confiance, transparence, support et performance.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Shield size={32} />,
                title: "Vérification rigoureuse",
                description:
                  "Tous les camionneurs et documents sont vérifiés avant activation.",
              },
              {
                icon: <Users size={32} />,
                title: "Support 24/7",
                description:
                  "Siège au Burkina Faso pour vous assister en français.",
              },
              {
                icon: <CheckCircle size={32} />,
                title: "Paiement sécurisé",
                description:
                  "Versement au camionneur seulement après livraison confirmée.",
              },
              {
                icon: <Star size={32} />,
                title: "Prix transparents",
                description:
                  "Comparez les offres et choisissez selon votre budget.",
              },
              {
                icon: <MapPinned size={32} />,
                title: "Suivi GPS",
                description:
                  "Suivez l'état de votre mission du chargement à la livraison.",
              },
              {
                icon: <Shield size={32} />,
                title: "Assurance livraison",
                description:
                  "Réduction des risques et médiation en cas de litige.",
              },
            ].map((service, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                <div className="h-12 w-12 rounded-2xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center">
                  {service.icon}
                </div>
                <h3 className="mt-5 text-base font-semibold text-[#0F172A]">{service.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-20 bg-[#F5F1ED]">
        <motion.div
          className="container-max"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#0F172A]">Présents là où ça compte</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Depuis notre siège à Ouagadougou, nous opérons en Afrique de l’Ouest pour être au plus près de nos clients et partenaires.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                flag: "🇧🇫",
                city: "Ouagadougou",
                country: "Burkina Faso",
                tag: "Siège social",
                desc: "Siège social et centre de développement principal",
                featured: true,
              },
              {
                flag: "🇨🇮",
                city: "Abidjan",
                country: "Côte d’Ivoire",
                tag: "Bureau",
                desc: "Bureau commercial et support client Afrique de l’Ouest",
                featured: false,
              },
              {
                flag: "🇧🇯",
                city: "Cotonou",
                country: "Bénin",
                tag: "Représentation",
                desc: "Représentation commerciale",
                featured: false,
              },
              {
                flag: "🇳🇪",
                city: "Niamey",
                country: "Niger",
                tag: "Représentation",
                desc: "Représentation commerciale",
                featured: false,
              },
            ].map((l) => (
              <motion.div
                key={l.city}
                variants={itemVariants}
                className={
                  "rounded-2xl border shadow-sm p-6 transition-all " +
                  (l.featured
                    ? "bg-[#0F172A] text-white border-[#0F172A]"
                    : "bg-white text-[#0F172A] border-gray-200 hover:shadow-lg hover:-translate-y-0.5")
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl" aria-hidden="true">{l.flag}</span>
                  <span
                    className={
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
                      (l.featured
                        ? "bg-white/10 text-white"
                        : "bg-[#F97316]/10 text-[#9A3412]")
                    }
                  >
                    {l.tag}
                  </span>
                </div>

                <div className="mt-5">
                  <h3 className={"text-lg font-semibold tracking-tight " + (l.featured ? "text-white" : "text-[#0F172A]")}>{l.city}</h3>
                  <p className={"mt-1 text-sm " + (l.featured ? "text-white/70" : "text-gray-500")}>{l.country}</p>
                </div>

                <p className={"mt-5 text-sm leading-relaxed " + (l.featured ? "text-white/70" : "text-gray-600")}>{l.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <motion.div
          className="container-max"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#0F172A]">Avis clients</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Des chantiers livrés à temps, avec des transporteurs vérifiés.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Aïcha Z.", city: "Ouagadougou", quote: "Service impeccable. J'ai reçu des offres en quelques minutes." },
              { name: "Issa K.", city: "Bobo-Dioulasso", quote: "Simple, rapide et rassurant. Le suivi est très clair." },
              { name: "Mariam T.", city: "Koudougou", quote: "Bon prix et camionneur sérieux. Je recommande." },
            ].map((t) => (
              <motion.div
                key={t.name}
                variants={itemVariants}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#F97316]">
                    <Star size={16} />
                    <Star size={16} />
                    <Star size={16} />
                    <Star size={16} />
                    <Star size={16} />
                  </div>
                  <span className="text-xs text-gray-500">★★★★★</span>
                </div>
                <p className="mt-4 text-sm text-gray-700 leading-relaxed">“{t.quote}”</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#F97316]/25 to-[#0F172A]/10 border border-gray-200" />
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.city}</p>
                  </div>
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
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
            Besoin d'un camion aujourd'hui ?
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-white/75 mb-10 max-w-2xl mx-auto">
            Publiez votre demande et recevez plusieurs offres. Choisissez en confiance.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/auth/signup?role=CLIENT"
              className="px-9 py-4 bg-[#F97316] text-white rounded-2xl font-semibold hover:bg-[#ea6a12] transition-colors inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-lg"
            >
              Demander un camion
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/auth/signup?role=TRUCKER"
              className="px-9 py-4 border border-white/30 text-white rounded-2xl font-semibold hover:bg-white hover:text-[#0F172A] transition-colors"
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
