"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import QuickSearchCard from "@/components/QuickSearchCard"

type HeroProps = {
  clientCtaHref: string
  truckerCtaHref: string
}

export default function Hero({ clientCtaHref, truckerCtaHref }: HeroProps) {
  const reduceMotion = useReducedMotion()
  const [playVideo, setPlayVideo] = useState(false)
  const fade = reduceMotion ? undefined : { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!media.matches) setPlayVideo(true)
  }, [])

  return (
    <section className="relative isolate overflow-hidden bg-[#071D40] text-white">
      <img
        src="/video/carriere-poster.jpg"
        alt="Benne chargée de roche circulant dans une carrière"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {playVideo ? (
        <video
          className="hero-video absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/video/carriere-poster.jpg"
          preload="metadata"
        >
          <source src="/video/carriere.mp4" type="video/mp4" />
        </video>
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-[#071D40]/92 via-[#071D40]/70 to-[#071D40]/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#071D40]/80 via-transparent to-[#071D40]/30" />

      <div className="container-max relative pb-10 pt-12 md:pb-16 md:pt-20">
        <motion.div
          initial={reduceMotion ? undefined : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="max-w-3xl"
        >
          <motion.p variants={fade} className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF7900]">
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
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#FF7900] px-7 text-base font-semibold text-[#071D40] transition duration-200 hover:-translate-y-0.5 hover:bg-[#e56d00]"
            >
              Trouver un camion
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              href={truckerCtaHref}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-7 text-base font-semibold text-white backdrop-blur hover:bg-white hover:text-[#071D40]"
            >
              Je suis transporteur
            </Link>
          </motion.div>
        </motion.div>

        <div className="mt-10">
          <QuickSearchCard />
        </div>
        <p className="mt-4 text-xs text-white/60">
          {playVideo
            ? "Vidéo d’illustration, sans son · benne chargée de roche dans une carrière, Mixkit"
            : "Image fixe de la même scène · Mixkit"}
        </p>
      </div>
    </section>
  )
}
