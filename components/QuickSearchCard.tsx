"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, MapPin, ArrowRightLeft } from "lucide-react"
import Link from "next/link"

type QuickSearchCardProps = {
  className?: string
}

export default function QuickSearchCard({ className }: QuickSearchCardProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={
        "rounded-[20px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)] border border-[#E2E8F0] " +
        (className ?? "")
      }
    >
      <form className="p-4 md:p-5" action="#">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_auto_1.2fr_1fr_1fr_auto] gap-3 items-stretch">
          <label className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500">Départ</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3">
              <MapPin size={18} className="text-[#F97316]" />
              <input
                className="w-full bg-transparent outline-none text-sm text-[#0F172A] placeholder:text-[#64748B]"
                placeholder="Ouagadougou"
                aria-label="Départ"
              />
            </div>
          </label>

          <div className="hidden md:flex items-end justify-center pb-1">
            <div className="h-11 w-11 rounded-xl border border-gray-200 bg-white flex items-center justify-center">
              <ArrowRightLeft size={18} className="text-gray-500" />
            </div>
          </div>

          <label className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500">Destination</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3">
              <MapPin size={18} className="text-[#F97316]" />
              <input
                className="w-full bg-transparent outline-none text-sm text-[#0F172A] placeholder:text-[#64748B]"
                placeholder="Où livrer ?"
                aria-label="Destination"
              />
            </div>
          </label>

          <label className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500">Matériau</span>
            <select
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 text-sm text-[#0F172A] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
              aria-label="Matériau"
              defaultValue="Sable"
            >
              <option>Sable</option>
              <option>Gravier</option>
              <option>Granite</option>
              <option>Béton</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500">Quantité</span>
            <input
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 text-sm text-[#0F172A] outline-none placeholder:text-[#64748B] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
              placeholder="20 tonnes"
              aria-label="Quantité"
            />
          </label>

          <div className="flex items-end">
            <Link
              href="/auth/signup?role=CLIENT"
              className="w-full md:w-auto h-14 inline-flex items-center justify-center gap-2 rounded-xl bg-[#F97316] text-white px-6 text-sm font-semibold hover:bg-[#EA580C] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              Trouver un camion
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
