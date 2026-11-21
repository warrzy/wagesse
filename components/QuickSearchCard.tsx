"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { ArrowRight, MapPin } from "lucide-react"
import { BF_CITIES, MATERIAL_TYPES } from "@/lib/config"

type QuickSearchCardProps = {
  className?: string
}

export const REQUEST_DRAFT_KEY = "wagesse-request-draft"

export default function QuickSearchCard({ className }: QuickSearchCardProps) {
  const router = useRouter()
  const [depart, setDepart] = useState("Ouagadougou")
  const [destination, setDestination] = useState("")
  const [material, setMaterial] = useState("Sable")
  const [quantity, setQuantity] = useState("")

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const amount = quantity.trim()
    sessionStorage.setItem(
      REQUEST_DRAFT_KEY,
      JSON.stringify({
        pickupCity: depart,
        dropoffCity: destination,
        material,
        quantity: amount,
      })
    )
    router.push("/auth/signup?role=CLIENT")
  }

  return (
    <div className={"rounded-3xl border border-white/20 bg-white p-4 text-[#071D40] shadow-[0_20px_60px_rgba(7,29,64,0.25)] md:p-5 " + (className ?? "")}>
      <form onSubmit={submit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
        <label className="md:col-span-3">
          <span className="text-xs font-semibold text-[#071D40]/60">Départ</span>
          <span className="mt-1 flex min-h-12 items-center gap-2 rounded-xl border border-[#071D40]/10 bg-[#F4F8FC] px-3">
            <MapPin size={18} className="text-[#FF7900]" aria-hidden="true" />
            <select aria-label="Départ" value={depart} onChange={(event) => setDepart(event.target.value)} className="w-full bg-transparent text-sm outline-none">
              {BF_CITIES.map((city) => (
                <option key={city.name}>{city.name}</option>
              ))}
            </select>
          </span>
        </label>
        <label className="md:col-span-3">
          <span className="text-xs font-semibold text-[#071D40]/60">Destination</span>
          <span className="mt-1 flex min-h-12 items-center gap-2 rounded-xl border border-[#071D40]/10 bg-[#F4F8FC] px-3">
            <MapPin size={18} className="text-[#FF7900]" aria-hidden="true" />
            <select aria-label="Destination" value={destination} onChange={(event) => setDestination(event.target.value)} className="w-full bg-transparent text-sm outline-none">
              <option value="">Choisir</option>
              {BF_CITIES.map((city) => (
                <option key={city.name}>{city.name}</option>
              ))}
            </select>
          </span>
        </label>
        <label className="md:col-span-2">
          <span className="text-xs font-semibold text-[#071D40]/60">Matériau</span>
          <select aria-label="Matériau" value={material} onChange={(event) => setMaterial(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-[#071D40]/10 bg-[#F4F8FC] px-3 text-sm outline-none">
            {MATERIAL_TYPES.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2">
          <span className="text-xs font-semibold text-[#071D40]/60">Quantité (tonnes)</span>
          <input
            aria-label="Quantité en tonnes"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="20"
            className="mt-1 min-h-12 w-full rounded-xl border border-[#071D40]/10 bg-[#F4F8FC] px-3 text-sm outline-none"
          />
        </label>
        <div className="md:col-span-2">
          <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-4 text-sm font-semibold text-[#071D40]">
            Créer la demande
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </form>
      <p className="mt-3 text-xs text-[#071D40]/55">Le trajet est repris dans le formulaire après la création du compte. Rien n’est publié avant votre validation.</p>
    </div>
  )
}
