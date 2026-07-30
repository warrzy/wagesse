"use client"

import { BRAND_CONFIG } from "@/lib/config"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState } from "react"

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <nav className="container-max h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-2xl">
          <div
            className="w-8 h-8 rounded-lg"
            style={{ backgroundColor: BRAND_CONFIG.colors.primary }}
          />
          <span style={{ color: BRAND_CONFIG.colors.primary }}>
            {BRAND_CONFIG.name}
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium hover:text-[#E8714D]">
            Fonctionnement
          </Link>
          <Link href="#materials" className="text-sm font-medium hover:text-[#E8714D]">
            Matériaux
          </Link>
          <Link href="/pricing" className="text-sm font-medium hover:text-[#E8714D]">
            Tarifs
          </Link>
          <Link href="/contact" className="text-sm font-medium hover:text-[#E8714D]">
            Contact
          </Link>
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm font-medium hover:text-[#E8714D]"
          >
            Connexion
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 bg-[#E8714D] text-white rounded-lg text-sm font-medium hover:bg-[#d45c39]"
          >
            S&apos;inscrire
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="container-max py-4 flex flex-col gap-4">
            <Link href="#features" className="py-2 font-medium">
              Fonctionnement
            </Link>
            <Link href="#materials" className="py-2 font-medium">
              Matériaux
            </Link>
            <Link href="/pricing" className="py-2 font-medium">
              Tarifs
            </Link>
            <Link href="/contact" className="py-2 font-medium">
              Contact
            </Link>
            <Link
              href="/auth/login"
              className="py-2 font-medium border-t border-gray-200 pt-4"
            >
              Connexion
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 bg-[#E8714D] text-white rounded-lg text-center font-medium"
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
