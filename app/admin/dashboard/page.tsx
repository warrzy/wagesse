"use client"

import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

export default function AdminDashboardPage() {
  return (
    <>
      <Header />

      <div className="min-h-screen bg-gray-50 pt-10 pb-16">
        <div className="container-max max-w-5xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Tableau de bord admin</h1>
            <p className="mt-1 text-sm text-gray-600">Gestion et supervision de la plateforme.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/admin/abonnements" className="card-hover block">
              <div className="card">
                <p className="text-sm font-semibold text-gray-900">Abonnements</p>
                <p className="mt-2 text-sm text-gray-600">Modifier les plans, crédits mensuels, coût de déblocage, ordre.</p>
              </div>
            </Link>

            <Link href="/dashboard/client" className="card-hover block">
              <div className="card">
                <p className="text-sm font-semibold text-gray-900">Voir l'interface client</p>
                <p className="mt-2 text-sm text-gray-600">Accéder au dashboard client (si autorisé) pour vérifications.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
