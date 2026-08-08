"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, MapPin, Star, Truck, Weight } from "lucide-react"

type TruckOfferCardProps = {
  className?: string
}

export default function TruckOfferCard({ className }: TruckOfferCardProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={
        "w-[290px] rounded-[18px] border border-[#E2E8F0] bg-white/95 backdrop-blur-sm shadow-[0_18px_50px_rgba(15,23,42,0.18)] p-5 text-[#0F172A] " +
        (className ?? "")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">Camion disponible</p>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#22c55e]/10 text-[#15803d] px-3 py-1 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" aria-hidden="true" />
          Disponible maintenant
        </span>
      </div>

      <p className="mt-3 text-base font-semibold">Benne 4 essieux</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-[#64748B]">
          <Weight size={16} className="text-[#F97316]" aria-hidden="true" />
          <span className="text-[#0F172A] font-semibold">25 tonnes</span>
        </div>
        <div className="flex items-center gap-2 text-[#64748B]">
          <MapPin size={16} className="text-[#F97316]" aria-hidden="true" />
          <span className="text-[#0F172A] font-semibold">Ouagadougou</span>
        </div>
        <div className="flex items-center gap-2 text-[#64748B]">
          <Truck size={16} className="text-[#F97316]" aria-hidden="true" />
          <span className="text-[#0F172A] font-semibold">Benne</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[#F97316]" aria-hidden="true">
            <Star size={14} fill="currentColor" />
            <Star size={14} fill="currentColor" />
            <Star size={14} fill="currentColor" />
            <Star size={14} fill="currentColor" />
            <Star size={14} className="opacity-50" />
          </div>
          <span className="text-sm font-semibold text-[#0F172A]">4,8</span>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] text-white px-4 py-3 text-sm font-semibold hover:bg-[#0b1220] transition-colors"
      >
        Voir l'offre
        <ArrowRight size={16} />
      </button>
    </motion.div>
  )
}
