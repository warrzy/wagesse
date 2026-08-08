"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, CheckCircle } from "lucide-react"
import TruckOfferCard from "@/components/TruckOfferCard"
import QuickSearchCard from "@/components/QuickSearchCard"

type HeroProps = {
  clientCtaHref: string
  truckerCtaHref: string
}

export default function Hero({ clientCtaHref, truckerCtaHref }: HeroProps) {
  const reduceMotion = useReducedMotion()

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <section className="relative bg-[#F8FAFC] overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-[#F8FAFC]" />
        <div
          className="absolute -top-44 -right-44 h-[520px] w-[520px] rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.35), transparent 60%)" }}
        />
        <div
          className="absolute -bottom-56 -left-56 h-[520px] w-[520px] rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, rgba(15,23,42,0.25), transparent 60%)" }}
        />
      </div>

      <div className="container-max relative pt-14 md:pt-20 pb-24 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <motion.div
              initial={reduceMotion ? undefined : "hidden"}
              animate={reduceMotion ? undefined : "visible"}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08 } },
              }}
            >
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="inline-flex items-center gap-2 rounded-full bg-[#F97316]/10 px-4 py-2 text-sm font-semibold text-[#9A3412]"
              >
                <span className="h-2 w-2 rounded-full bg-[#F97316]" aria-hidden="true" />
                Transport de matériaux simplifié au Burkina Faso
              </motion.div>

              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="mt-7 text-[44px] leading-[1.02] md:text-[64px] lg:text-[72px] font-extrabold tracking-tight text-[#0F172A] max-w-[16ch]"
              >
                Votre camion.
                <br />
                <span className="text-[#F97316]">Au bon prix.</span>
                <br />
                Au bon moment.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-6 text-base md:text-lg text-[#64748B] leading-relaxed max-w-xl"
              >
                Décrivez votre besoin, recevez les offres de camionneurs vérifiés et choisissez celle qui vous convient.
              </motion.p>

              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-9 flex flex-col sm:flex-row gap-3"
              >
                <Link
                  href={clientCtaHref}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F97316] text-white px-7 py-4 text-sm md:text-base font-semibold shadow-[0_12px_40px_rgba(249,115,22,0.25)] hover:bg-[#EA580C] transition-all hover:-translate-y-0.5"
                >
                  Trouver un camion
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href={truckerCtaHref}
                  className="inline-flex items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-7 py-4 text-sm md:text-base font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                >
                  Je suis camionneur
                </Link>
              </motion.div>

              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-6 flex flex-wrap gap-3 text-sm text-[#64748B]"
              >
                {[
                  "Camionneurs vérifiés",
                  "Paiement sécurisé",
                  "Support local",
                ].map((t) => (
                  <span key={t} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 border border-gray-200">
                    <CheckCircle size={16} className="text-[#F97316]" aria-hidden="true" />
                    {t}
                  </span>
                ))}
              </motion.div>

              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-7 flex items-center gap-3"
                aria-label="Preuve sociale"
              >
                <div className="inline-flex items-center gap-1 text-[#F97316]">
                  <span className="text-sm font-semibold">★★★★★</span>
                  <span className="text-sm text-[#64748B]">4,8/5</span>
                </div>
                <span className="text-sm text-[#64748B]">Des demandes de transport réalisées</span>
              </motion.div>
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-[28px] bg-[#F97316]/10 blur-2xl" aria-hidden="true" />

              <div className="relative rounded-[24px] overflow-hidden border border-gray-200 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                <div className="relative aspect-[4/3]">
                  <Image
                    src="/PosterMyWall_GeneratedImage_faa2675e.png"
                    alt="Camion benne sur un chantier au Burkina Faso"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 520px"
                    className="object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/60 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0F172A]/15" />

                  <div className="absolute bottom-6 left-4 lg:-left-10">
                    <TruckOfferCard />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="relative mt-12">
          <div className="lg:absolute lg:left-0 lg:right-0 lg:top-0 lg:translate-y-1/2">
            <QuickSearchCard />
          </div>
          <div className="hidden lg:block h-32" />
        </div>
      </div>
    </section>
  )
}
