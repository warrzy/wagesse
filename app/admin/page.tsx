"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type DashboardKpis = {
  users: {
    total: number
    newToday: number
    newWeek: number
    newMonth: number
  }
  truckers: {
    total: number
    verified: number
    pending: number
    suspended: number
  }
  requests: {
    total: number
    today: number
    byStatus: Record<string, number>
  }
  quotes: {
    total: number
    byStatus: Record<string, number>
  }
  missions: {
    total: number
    completed: number
  }
  payments: {
    total: number
    totalAmount: number
    byType: Record<string, { count: number; amount: number }>
  }
  subscriptions: {
    total: number
    byTier: Record<string, number>
  }
  credits: {
    transactions: number
    byType: Record<string, number>
  }
}

type ActivityItem = {
  at: string
  type: string
  label: string
  userId?: string
  userPhone?: string
  resourceId?: string
  status?: string
}

export default function AdminIndexPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const res = await apiClient.getAdminDashboard()
      if (!res.success) {
        setError(res.error || "Erreur lors du chargement du dashboard")
        setLoading(false)
        return
      }

      const data = res.data as any
      setKpis(data?.kpis ?? null)
      setActivity((data?.activity ?? []) as ActivityItem[])
      setLoading(false)
    }

    load()
  }, [])

  const requestStatusRows = useMemo(() => {
    const byStatus = kpis?.requests.byStatus ?? {}
    return Object.entries(byStatus).sort((a, b) => b[1] - a[1])
  }, [kpis])

  const quoteStatusRows = useMemo(() => {
    const byStatus = kpis?.quotes.byStatus ?? {}
    return Object.entries(byStatus).sort((a, b) => b[1] - a[1])
  }, [kpis])

  const paymentTypeRows = useMemo(() => {
    const byType = kpis?.payments.byType ?? {}
    return Object.entries(byType).sort((a, b) => (b[1]?.amount ?? 0) - (a[1]?.amount ?? 0))
  }, [kpis])

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">KPI et activité de la plateforme.</p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/abonnements"
            className="py-2 px-4 border-2 border-[#E8714D] text-[#E8714D] rounded-lg font-medium hover:bg-[#E8714D] hover:text-white transition-colors"
          >
            Abonnements
          </Link>
        </div>
      </div>

          {loading ? (
            <div className="card">
              <p className="text-sm text-gray-600">Chargement...</p>
            </div>
          ) : error ? (
            <div className="card">
              <p className="text-sm text-red-600 font-semibold">Erreur</p>
              <p className="mt-2 text-sm text-gray-600">{error}</p>
            </div>
          ) : !kpis ? (
            <div className="card">
              <p className="text-sm text-gray-600">Aucune donnée.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/admin/utilisateurs" className="card-hover block">
                  <p className="text-xs text-gray-500">Utilisateurs</p>
                  <p className="mt-1 text-2xl font-bold">{kpis.users.total}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    Aujourd’hui: {kpis.users.newToday} | Semaine: {kpis.users.newWeek} | Mois: {kpis.users.newMonth}
                  </p>
                </Link>

                <Link href="/admin/camionneurs" className="card-hover block">
                  <p className="text-xs text-gray-500">Camionneurs</p>
                  <p className="mt-1 text-2xl font-bold">{kpis.truckers.total}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    Vérifiés: {kpis.truckers.verified} | En attente: {kpis.truckers.pending} | Suspendus: {kpis.truckers.suspended}
                  </p>
                </Link>

                <Link href="/admin/annonces" className="card-hover block">
                  <p className="text-xs text-gray-500">Annonces (demandes)</p>
                  <p className="mt-1 text-2xl font-bold">{kpis.requests.total}</p>
                  <p className="mt-2 text-xs text-gray-600">Nouvelles aujourd’hui: {kpis.requests.today}</p>
                </Link>

                <Link href="/admin/paiements" className="card-hover block">
                  <p className="text-xs text-gray-500">Paiements</p>
                  <p className="mt-1 text-2xl font-bold">{kpis.payments.total}</p>
                  <p className="mt-2 text-xs text-gray-600">Volume: {Math.round(kpis.payments.totalAmount)} XOF</p>
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <p className="text-sm font-semibold">Annonces par statut (DB)</p>
                  <div className="mt-4 space-y-2">
                    {requestStatusRows.length === 0 ? (
                      <p className="text-sm text-gray-600">Aucun statut.</p>
                    ) : (
                      requestStatusRows.map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{status}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="card">
                  <p className="text-sm font-semibold">Offres (quotes) par statut (DB)</p>
                  <div className="mt-4 space-y-2">
                    {quoteStatusRows.length === 0 ? (
                      <p className="text-sm text-gray-600">Aucun statut.</p>
                    ) : (
                      quoteStatusRows.map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{status}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card lg:col-span-2">
                  <p className="text-sm font-semibold">Activité récente</p>
                  <div className="mt-4 divide-y divide-gray-200">
                    {activity.length === 0 ? (
                      <p className="text-sm text-gray-600">Aucune activité récente.</p>
                    ) : (
                      activity.map((it, idx) => (
                        <div key={`${it.type}-${it.resourceId ?? "-"}-${idx}`} className="py-3 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-semibold text-gray-900">{it.label}</span>
                            <span className="text-xs text-gray-500">{new Date(it.at).toLocaleString()}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            <span>Type: {it.type}</span>
                            {it.status ? <span> | Statut: {it.status}</span> : null}
                            {it.userPhone ? <span> | User: {it.userPhone}</span> : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="card">
                  <p className="text-sm font-semibold">Paiements par type (DB)</p>
                  <div className="mt-4 space-y-2">
                    {paymentTypeRows.length === 0 ? (
                      <p className="text-sm text-gray-600">Aucun type.</p>
                    ) : (
                      paymentTypeRows.map(([type, v]) => (
                        <div key={type} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">{type}</span>
                            <span className="font-semibold">{v.count}</span>
                          </div>
                          <div className="text-xs text-gray-500">{Math.round(v.amount)} XOF</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                  <p className="text-xs text-gray-500">Abonnements</p>
                  <p className="mt-1 text-2xl font-bold">{kpis.subscriptions.total}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    {Object.entries(kpis.subscriptions.byTier)
                      .map(([tier, c]) => `${tier}: ${c}`)
                      .join(" | ")}
                  </p>
                </div>

                <div className="card">
                  <p className="text-xs text-gray-500">Transports finalisés</p>
                  <p className="mt-1 text-2xl font-bold">{kpis.missions.completed}</p>
                  <p className="mt-2 text-xs text-gray-600">Total missions: {kpis.missions.total}</p>
                </div>

                <div className="card">
                  <p className="text-xs text-gray-500">Transactions crédits</p>
                  <p className="mt-1 text-2xl font-bold">{kpis.credits.transactions}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    {Object.entries(kpis.credits.byType)
                      .map(([t, c]) => `${t}: ${c}`)
                      .join(" | ")}
                  </p>
                </div>
              </div>
            </div>
          )}
    </div>
  )
}
