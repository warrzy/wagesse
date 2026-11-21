"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"
import { useEffect, useState } from "react"
import { apiClient, StoredUser } from "@/lib/api-client"
import BrandLogo from "@/components/BrandLogo"

const links = [
  { href: "/#fonctionnement", label: "Fonctionnement" },
  { href: "/#materiaux", label: "Matériaux" },
  { href: "/#camions", label: "Camions" },
  { href: "/pricing", label: "Tarifs" },
  { href: "/contact", label: "Contact" },
]

export default function Header() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<StoredUser | null>(null)

  useEffect(() => {
    const cached = apiClient.getUser()
    if (cached) {
      setUser(cached)
      return
    }
    if (apiClient.getToken()) {
      apiClient.getCurrentUser().then((res) => {
        if (res.success && res.data) {
          const fetched = res.data as StoredUser
          apiClient.setUser(fetched)
          setUser(fetched)
        }
      })
    }
  }, [])

  const handleLogout = () => {
    apiClient.logout()
    setUser(null)
    setMobileMenuOpen(false)
    router.push("/")
  }

  const dashboardHref = user?.role === "TRUCKER"
    ? "/dashboard/trucker"
    : user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
      ? "/admin"
      : "/dashboard/client"

  return (
    <header className="sticky top-0 z-50 border-b border-[#071D40]/10 bg-[#F4F8FC]/90 backdrop-blur">
      <nav className="container-max flex h-[76px] items-center justify-between gap-6">
        <BrandLogo />

        <div className="hidden flex-1 items-center justify-center gap-8 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-semibold text-[#071D40]/80 transition-colors hover:text-[#087DD1]">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link href={dashboardHref} className="text-sm font-semibold text-[#071D40]">
                {user.firstName || "Mon espace"}
              </Link>
              <button type="button" onClick={handleLogout} className="button-outline px-4 py-2 text-sm">
                Déconnexion
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="text-sm font-semibold text-[#071D40]">
              Connexion
            </Link>
          )}
          <Link href="/auth/signup?role=CLIENT" className="button-primary px-5 py-3 text-sm">
            Trouver un camion
          </Link>
        </div>

        <button
          className="grid h-12 w-12 place-items-center rounded-2xl border border-[#071D40]/10 lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {mobileMenuOpen ? (
        <div className="border-t border-[#071D40]/10 bg-[#F4F8FC] lg:hidden">
          <div className="container-max flex flex-col gap-2 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-12 rounded-2xl px-3 py-3 text-base font-semibold text-[#071D40]"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/auth/signup?role=CLIENT" className="button-primary mt-2" onClick={() => setMobileMenuOpen(false)}>
              Trouver un camion
            </Link>
            {user ? (
              <>
                <Link href={dashboardHref} className="button-secondary" onClick={() => setMobileMenuOpen(false)}>
                  {user.firstName || "Mon espace"}
                </Link>
                <button type="button" onClick={handleLogout} className="button-outline">
                  Déconnexion
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="button-outline" onClick={() => setMobileMenuOpen(false)}>
                Connexion
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}
