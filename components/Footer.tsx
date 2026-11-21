"use client"

import { BRAND_CONFIG } from "@/lib/config"
import Link from "next/link"
import { MARKETPLACE_IMAGES } from "@/lib/marketplace-images"
import BrandLogo from "@/components/BrandLogo"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-0 bg-[#071D40] text-white">
      <div className="container-max py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <BrandLogo tone="dark" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
              Mise en relation entre clients et camionneurs pour le transport de matériaux au Burkina Faso.
            </p>
            <a href={`mailto:${BRAND_CONFIG.social.email}`} className="mt-6 inline-block text-sm font-semibold text-[#FF7900]">
              {BRAND_CONFIG.social.email}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            <div>
              <h2 className="text-sm font-semibold text-white">Clients</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li><Link href="/auth/signup?role=CLIENT" className="hover:text-white">Publier gratuitement</Link></li>
                <li><Link href="/#fonctionnement" className="hover:text-white">Comment ça marche</Link></li>
                <li><Link href="/#faq" className="hover:text-white">Questions fréquentes</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Transporteurs</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li><Link href="/auth/signup?role=TRUCKER" className="hover:text-white">Créer un compte</Link></li>
                <li><Link href="/auth/login" className="hover:text-white">Connexion</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Crédits et forfaits</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Informations</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/terms" className="hover:text-white">Conditions</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Confidentialité</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/50">
          <p>© {currentYear} {BRAND_CONFIG.name}. Les photographies sont des illustrations sous licence Pexels. La vidéo du bandeau est une illustration Mixkit, sans son. Elles ne représentent pas des chantiers, des flottes ni des partenaires de WAGESSE.</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {MARKETPLACE_IMAGES.map((image) => (
              <li key={image.id}>
                <a href={image.source} className="underline decoration-white/20 hover:text-white">{image.photographer}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
