"use client"

import { BRAND_CONFIG } from "@/lib/config"
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
    <footer className="bg-[#0F172A] text-white mt-24">
      <div className="container-max py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 font-extrabold tracking-tight text-lg">
              <div className="w-9 h-9 rounded-xl" style={{ backgroundColor: "#F97316" }} />
              <span>{BRAND_CONFIG.name}</span>
            </div>
            <p className="mt-4 text-sm text-white/70 max-w-sm">
              Le transport de matériaux, simplement.
            </p>

            <div className="mt-6 flex items-center gap-4">
              <a
                href={BRAND_CONFIG.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Globe size={20} />
              </a>
              <a
                href={BRAND_CONFIG.social.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle size={20} />
              </a>
              <a
                href={`mailto:${BRAND_CONFIG.social.email}`}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Email"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Plateforme</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <Link href="#features" className="hover:text-white transition-colors">Fonctionnement</Link>
                </li>
                <li>
                  <Link href="#materials" className="hover:text-white transition-colors">Matériaux</Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">Tarifs</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Camionneurs</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/auth/signup?role=TRUCKER" className="hover:text-white transition-colors">Devenir partenaire</Link>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:text-white transition-colors">Connexion</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Entreprise</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">Mentions légales</Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Contact</h4>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-white/70" />
                  <a href={`mailto:${BRAND_CONFIG.social.email}`} className="hover:text-white transition-colors">
                    {BRAND_CONFIG.social.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-white/70" />
                  <a href="tel:+226" className="hover:text-white transition-colors">
                    +226 xx xx xx xx
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-white/70" />
                  <span>Ouagadougou, Burkina Faso</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/60">&copy; {currentYear} {BRAND_CONFIG.name}. Tous droits réservés.</p>
          <p className="text-xs text-white/50">Le mode de paiement est indiqué au moment de la commande.</p>
        </div>
      </div>
    </footer>
  )
}
