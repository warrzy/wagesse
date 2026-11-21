"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, Home, Truck, Wallet } from "lucide-react"

const items = [
  { href: "/dashboard/trucker", label: "Accueil", icon: Home },
  { href: "/dashboard/trucker/requests", label: "Demandes", icon: ClipboardList },
  { href: "/dashboard/trucker/vehicles", label: "Véhicules", icon: Truck },
  { href: "/pricing", label: "Crédits", icon: Wallet },
]

export default function TruckerDock() {
  const pathname = usePathname()

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[#071D40]/10 bg-white/95 backdrop-blur lg:hidden" aria-label="Navigation transporteur">
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={"flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold " + (active ? "text-[#FF7900]" : "text-[#071D40]/70")}
              >
                <Icon size={20} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
