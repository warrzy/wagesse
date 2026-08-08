"use client"

import { BRAND_CONFIG } from "@/lib/config"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"
import { useEffect, useState } from "react"
import { apiClient, StoredUser } from "@/lib/api-client"

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
    // Existing session (token set before user info was cached) — fetch and cache it.
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
    router.push("/")
  }

  const dashboardHref = user?.role === "TRUCKER" ? "/dashboard/trucker" : "/dashboard/client"

  return (
    <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/75 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="container-max h-[76px] flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-lg text-[#0F172A]">
          <div className="w-9 h-9 rounded-xl" style={{ backgroundColor: "#F97316" }} />
          <span>
            {BRAND_CONFIG.name}
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center justify-center gap-10 flex-1">
          <Link href="#features" className="text-sm font-semibold text-[#0F172A] hover:text-[#F97316] transition-colors">
            Fonctionnement
          </Link>
          <Link href="#materials" className="text-sm font-semibold text-[#0F172A] hover:text-[#F97316] transition-colors">
            Matériaux
          </Link>
          <Link href="/pricing" className="text-sm font-semibold text-[#0F172A] hover:text-[#F97316] transition-colors">
            Tarifs
          </Link>
          <Link href="/contact" className="text-sm font-semibold text-[#0F172A] hover:text-[#F97316] transition-colors">
            Contact
          </Link>
        </div>

        {/* CTA Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/auth/signup?role=CLIENT"
            className="inline-flex items-center justify-center rounded-xl bg-[#F97316] text-white px-5 py-3 text-sm font-semibold shadow-sm hover:shadow-md hover:bg-[#EA580C] transition-all"
          >
            Demander un camion
          </Link>

          {user ? (
            <>
              <Link href={dashboardHref} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                <div className="h-9 w-9 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-sm font-bold">
                  {(user.firstName?.[0] || "U").toUpperCase()}
                </div>
                <div className="hidden xl:block">
                  <p className="text-sm font-semibold text-[#0F172A] leading-none">{user.firstName || "Mon compte"}</p>
                  <p className="text-xs text-[#64748B]">Compte</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-3 border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-3 py-2 text-sm font-semibold text-[#0F172A] hover:text-[#F97316] transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/auth/signup?role=CLIENT"
                className="px-4 py-3 border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden p-2 rounded-xl hover:bg-[#F8FAFC] transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E2E8F0] bg-white">
          <div className="container-max py-5 flex flex-col gap-3">
            <Link href="#features" className="py-2 font-semibold text-[#0F172A]">
              Fonctionnement
            </Link>
            <Link href="#materials" className="py-2 font-semibold text-[#0F172A]">
              Matériaux
            </Link>
            <Link href="/pricing" className="py-2 font-semibold text-[#0F172A]">
              Tarifs
            </Link>
            <Link href="/contact" className="py-2 font-semibold text-[#0F172A]">
              Contact
            </Link>

            <Link
              href="/auth/signup?role=CLIENT"
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-[#F97316] text-white px-5 py-3 text-sm font-semibold shadow-sm hover:bg-[#EA580C] transition-colors"
            >
              Demander un camion
            </Link>

            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  className="py-2 font-semibold text-[#0F172A] border-t border-[#E2E8F0] pt-4"
                >
                  {user.firstName || "Mon compte"}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-3 border border-[#E2E8F0] rounded-xl text-center font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="py-2 font-semibold text-[#0F172A] border-t border-[#E2E8F0] pt-4"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/signup?role=CLIENT"
                  className="px-4 py-3 border border-[#E2E8F0] rounded-xl text-center font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
