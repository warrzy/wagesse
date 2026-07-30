"use client"

import { BRAND_CONFIG, BF_CITIES } from "@/lib/config"
import Link from "next/link"
import {
  Globe,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
} from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#2C3E50] text-gray-100 mt-20">
      {/* Main Footer */}
      <div className="container-max py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-4">
              <div
                className="w-8 h-8 rounded-lg"
                style={{ backgroundColor: BRAND_CONFIG.colors.primary }}
              />
              <span>{BRAND_CONFIG.name}</span>
            </div>
            <p className="text-sm text-gray-300">
              La plateforme de fret #1 au Burkina Faso
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/find-truck" className="hover:text-white">
                  Trouver un camion
                </Link>
              </li>
              <li>
                <Link href="/post-request" className="hover:text-white">
                  Publier une demande
                </Link>
              </li>
              <li>
                <Link href="/become-trucker" className="hover:text-white">
                  Devenir camionneur
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white">
                  Comment ça marche
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="hover:text-white">
                  Conditions générales
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/cancellation" className="hover:text-white">
                  Politique d&apos;annulation
                </Link>
              </li>
              <li>
                <Link href="/dispute-resolution" className="hover:text-white">
                  Gestion des litiges
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <a
                  href={`mailto:${BRAND_CONFIG.social.email}`}
                  className="hover:text-white"
                >
                  {BRAND_CONFIG.social.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <a href="tel:+226" className="hover:text-white">
                  +226 xx xx xx xx
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>Ouagadougou, Burkina Faso</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-700 my-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-sm text-gray-400">
            &copy; {currentYear} {BRAND_CONFIG.name}. Tous droits réservés.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href={BRAND_CONFIG.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Globe size={20} />
            </a>
            <a
              href={BRAND_CONFIG.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="WhatsApp"
            >
              <MessageCircle size={20} />
            </a>
            <a
              href={`mailto:${BRAND_CONFIG.social.email}`}
              className="hover:text-white transition-colors"
              aria-label="Email"
            >
              <Mail size={20} />
            </a>
          </div>
        </div>
      </div>

      {/* Bar at bottom */}
      <div className="border-t border-gray-700 py-4 text-center text-xs text-gray-400">
        Plateforme de mise en relation sécurisée • Orange Money | Mobile Money | Cartes
      </div>
    </footer>
  )
}
