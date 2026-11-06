"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"

type Order = {
  id: string
  reference: string
  status: string
  title: string
  amountXof: number
  currency: string
  createdAt: string
}

export default function CommandesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    if (!apiClient.getToken()) {
      router.push("/auth/login")
      return
    }
    apiClient.getCommercialOrders().then((res) => {
      if (res.success) setOrders((res.data as Order[]) || [])
    })
  }, [router])

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-10 pb-16">
        <div className="container-max max-w-3xl">
          <h1 className="text-2xl font-bold">Mes commandes</h1>
          <div className="mt-6 space-y-3">
            {orders.length === 0 ? <p className="text-sm text-gray-500">Aucune commande.</p> : null}
            {orders.map((order) => (
              <Link key={order.id} href={`/dashboard/commandes/${order.id}`} className="card block">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{order.title}</p>
                    <p className="text-xs text-gray-500">{order.reference}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{order.amountXof.toLocaleString("fr-FR")} {order.currency}</p>
                    <p className="text-gray-500">{order.status}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
