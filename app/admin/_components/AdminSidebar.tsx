"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import BrandLogo from "@/components/BrandLogo"

type NavItem = {
  label: string
  href: string
}

type NavSection = {
  title: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    title: "Dashboard",
    items: [{ label: "Vue d’ensemble", href: "/admin" }],
  },
  {
    title: "Gestion",
    items: [
      { label: "Annonces", href: "/admin/annonces" },
      { label: "Offres", href: "/admin/offres" },
      { label: "Transports", href: "/admin/transports" },
      { label: "Utilisateurs", href: "/admin/utilisateurs" },
      { label: "Camionneurs", href: "/admin/camionneurs" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Transactions", href: "/admin/transactions" },
      { label: "Paiements", href: "/admin/paiements" },
      { label: "Commandes", href: "/admin/commandes" },
      { label: "Wallet / Crédits", href: "/admin/wallet" },
      { label: "Abonnements", href: "/admin/abonnements" },
      { label: "Tarifs", href: "/admin/tarifs" },
      { label: "Promotions", href: "/admin/promotions" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Matériaux", href: "/admin/materiaux" },
      { label: "Types de camions", href: "/admin/types-camions" },
    ],
  },
  {
    title: "Contenu",
    items: [{ label: "Contenus du site", href: "/admin/contenus" }],
  },
  {
    title: "Administration",
    items: [
      { label: "Rôles & permissions", href: "/admin/roles" },
      { label: "Administrateurs", href: "/admin/administrateurs" },
      { label: "Notifications", href: "/admin/notifications" },
      { label: "Journal d’audit", href: "/admin/logs" },
      { label: "Réinitialisation de mot de passe", href: "/admin/mots-de-passe" },
      { label: "Paramètres", href: "/admin/parametres" },
    ],
  },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(href + "/")
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-white/50">{section.title}</p>
          <div className="mt-2 space-y-1">
            {section.items.map((item) => {
              const active = isActivePath(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={
                    "block min-h-11 rounded-xl px-3 py-2 text-sm transition-colors " +
                    (active ? "bg-[#FF7900] text-[#071D40]" : "text-white/80 hover:bg-white/10 hover:text-white")
                  }
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="bg-[#071D40] px-4 py-3 text-white lg:hidden">
        <BrandLogo tone="dark" />
        <button type="button" className="mt-3 text-sm font-semibold" onClick={() => setOpen((value) => !value)}>
          {open ? "Fermer le menu" : "Menu"}
        </button>
        {open ? <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} /> : null}
      </div>
      <aside className="hidden w-72 flex-col border-r border-white/10 bg-[#071D40] text-white lg:flex">
      <div className="border-b border-white/10 px-6 py-5">
        <BrandLogo tone="dark" />
        <p className="mt-3 text-xs text-white/70">Administration</p>
      </div>

      <NavLinks pathname={pathname} />

      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-xs text-white/60">Back-office</p>
      </div>
    </aside>
    </>
  )
}
