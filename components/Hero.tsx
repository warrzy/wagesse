"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import CatalogImage from "@/components/CatalogImage"
import QuickSearchCard from "@/components/QuickSearchCard"
import { marketplaceImage } from "@/lib/marketplace-images"

type HeroProps = {
  clientCtaHref: string
  truckerCtaHref: string
}

export default function Hero({ clientCtaHref, truckerCtaHref }: HeroProps) {
  const reduceMotion = useReducedMotion()
  const photo = marketplaceImage("benne-carriere")
  const fade = reduceMotion ? undefined : { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }

  return (
    <section className="relative isolate overflow-hidden bg-[#13283A] text-white">
      <CatalogImage src={photo.src} alt={photo.alt} priority sizes="100vw" className="object-[28%_center]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#13283A]/95 via-[#13283A]/75 to-[#13283A]/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#13283A]/80 via-transparent to-[#13283A]/35" />

      <div className="container-max relative pb-10 pt-12 md:pb-16 md:pt-20">
        <motion.div
          initial={reduceMotion ? undefined : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="max-w-3xl"
        >
          <motion.p variants={fade} className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8B55B]">
            Burkina Faso · Matériaux
          </motion.p>
          <motion.h1
            variants={fade}
            className="mt-4 max-w-[14ch] text-5xl font-semibold leading-[0.95] text-white md:text-7xl"
          >
            Le camion qu’il faut pour le chantier.
          </motion.h1>
          <motion.p variants={fade} className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
            Décrivez le matériau, la quantité et le trajet. Les camionneurs répondent par un devis. Vous comparez, puis vous suivez la mission.
          </motion.p>
          <motion.div variants={fade} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={clientCtaHref}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#ED8A25] px-7 text-base font-semibold text-[#13283A] hover:bg-[#d9771a]"
            >
              Trouver un camion
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              href={truckerCtaHref}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-7 text-base font-semibold text-white backdrop-blur hover:bg-white hover:text-[#13283A]"
            >
              Je suis transporteur
            </Link>
          </motion.div>
        </motion.div>

        <div className="mt-10">
          <QuickSearchCard />
        </div>
        <p className="mt-4 text-xs text-white/60">Photographie d’illustration · {photo.photographer}, Pexels</p>
      </div>
    </section>
  )
}
