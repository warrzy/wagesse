"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"

type Order = {
  id: string
  reference: string
  status: string
  kind: string
  title: string
  amountXof: number
  currency: string
  credits: number
  monthlyBoosts: number
  benefits: unknown
  paymentInstructions: string
  decisionNote: string | null
  createdAt: string
  events: { id: string; action: string; note: string | null; createdAt: string }[]
}

export default function CommandePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = apiClient.getToken()
    if (!token) {
      router.push("/auth/login")
      return
    }
    apiClient.getCommercialOrder(params.id).then((res) => {
      if (!res.success) {
        setError(res.error || "Commande introuvable")
        return
      }
      setOrder(res.data as Order)
    })
  }, [params.id, router])

  const benefits = Array.isArray(order?.benefits) ? (order?.benefits as unknown[]).map((item) => String(item)) : []

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-10 pb-16">
        <div className="container-max max-w-2xl">
          <Link href="/dashboard/commandes" className="text-sm font-semibold text-[#E8714D]">
            Toutes mes commandes
          </Link>
          {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}
          {!order && !error ? <p className="mt-6 text-sm text-gray-500">Chargement…</p> : null}
          {order ? (
            <div className="card mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{order.reference}</p>
              <h1 className="mt-1 text-2xl font-bold">{order.title}</h1>
              <p className="mt-2 text-sm text-gray-600">
                Statut : <span className="font-semibold">{order.status}</span>
              </p>
              <p className="mt-4 text-3xl font-extrabold">
                {order.amountXof.toLocaleString("fr-FR")} <span className="text-base font-semibold text-gray-600">{order.currency}</span>
              </p>
              <p className="mt-2 text-sm text-gray-700">{order.credits} crédits figés au moment de la demande</p>
              {order.monthlyBoosts ? <p className="text-sm text-gray-700">{order.monthlyBoosts} boosts</p> : null}
              {benefits.length ? (
                <ul className="mt-3 text-sm text-gray-700 list-disc pl-5">
                  {benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-6 rounded-xl border border-gray-200 bg-[#F8FAFC] p-4 text-sm text-gray-700">
                <p className="font-semibold text-[#0F172A]">Instructions de règlement</p>
                <p className="mt-2 whitespace-pre-wrap">{order.paymentInstructions}</p>
              </div>
              {order.decisionNote ? <p className="mt-4 text-sm text-gray-700">Décision : {order.decisionNote}</p> : null}
              <div className="mt-6">
                <p className="text-sm font-semibold">Historique</p>
                <ul className="mt-2 space-y-2 text-sm text-gray-700">
                  {order.events.map((event) => (
                    <li key={event.id}>
                      {new Date(event.createdAt).toLocaleString("fr-FR")} — {event.action}
                      {event.note ? ` — ${event.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  )
}
