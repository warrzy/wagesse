"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type PlanRow = {
  id: string
  code: string | null
  name: string
  tier: string
  monthlyPrice: number
  annualPrice: number | null
  currency: string
  trialDays: number
  monthlyCredits: number
  unlockCostCredits: number
  monthlyBoosts: number
  cycleDays: number
  benefits: any
  features: any
  platformCommissionRate: number
  isActive: boolean
  isPublished: boolean
  isVisible: boolean
  badge: string | null
  archivedAt: string | null
  sortOrder: number
  maxVehicles: number
  maxRequests: number | null
  maxProposals: number | null
  createdAt: string
  updatedAt: string
  _count: { subscriptions: number }
}

type ListResponse = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: PlanRow[]
}

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR")} ${currency}`
}

export default function AdminAbonnementsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createCode, setCreateCode] = useState("")
  const [createName, setCreateName] = useState("")
  const [createTier, setCreateTier] = useState("")
  const [createMonthlyPrice, setCreateMonthlyPrice] = useState<number>(0)
  const [createCurrency, setCreateCurrency] = useState("XOF")
  const [createMonthlyCredits, setCreateMonthlyCredits] = useState<number>(0)
  const [createMonthlyBoosts, setCreateMonthlyBoosts] = useState<number>(0)
  const [createSortOrder, setCreateSortOrder] = useState<number>(0)
  const [createBadge, setCreateBadge] = useState("")
  const [createIsPublished, setCreateIsPublished] = useState(false)
  const [createIsVisible, setCreateIsVisible] = useState(true)

  const [q, setQ] = useState("")
  const [tier, setTier] = useState("")
  const [isActive, setIsActive] = useState<"" | "true" | "false">("")
  const [isPublished, setIsPublished] = useState<"" | "true" | "false">("")
  const [isVisible, setIsVisible] = useState<"" | "true" | "false">("")
  const [archived, setArchived] = useState<"" | "true" | "false">("")
  const [sort, setSort] = useState("sortOrder_asc")

  const [page, setPage] = useState(1)
  const pageSize = 20

  const canPrev = useMemo(() => (data?.page || 1) > 1, [data])
  const canNext = useMemo(() => (data?.page || 1) < (data?.totalPages || 1), [data])

  const load = async (opts?: { page?: number }) => {
    setLoading(true)
    setError(null)

    const targetPage = opts?.page ?? page
    const res = await apiClient.adminListAbonnements({
      page: targetPage,
      pageSize,
      q: q || undefined,
      tier: tier || undefined,
      isActive: isActive ? isActive === "true" : undefined,
      isPublished: isPublished ? isPublished === "true" : undefined,
      isVisible: isVisible ? isVisible === "true" : undefined,
      archived: archived ? archived === "true" : undefined,
      sort,
    })

    if (!res.success) {
      setError(res.error || "Erreur")
      setLoading(false)
      return
    }

    setData((res.data as any) as ListResponse)
    setLoading(false)
  }

  useEffect(() => {
    load({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setPage(1)
    load({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, isActive, isPublished, isVisible, archived, sort])

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    await load({ page: 1 })
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreating(true)

    const res = await apiClient.adminCreateAbonnementPlan({
      code: createCode.trim() || null,
      name: createName,
      tier: createTier,
      monthlyPrice: createMonthlyPrice,
      currency: createCurrency,
      monthlyCredits: createMonthlyCredits,
      monthlyBoosts: createMonthlyBoosts,
      sortOrder: createSortOrder,
      badge: createBadge.trim() || null,
      isActive: true,
      isPublished: createIsPublished,
      isVisible: createIsVisible,
    })

    if (!res.success) {
      setError(res.error || "Erreur")
      setCreating(false)
      return
    }

    setCreateOpen(false)
    setCreateCode("")
    setCreateName("")
    setCreateTier("")
    setCreateMonthlyPrice(0)
    setCreateCurrency("XOF")
    setCreateMonthlyCredits(0)
    setCreateMonthlyBoosts(0)
    setCreateSortOrder(0)
    setCreateBadge("")
    setCreateIsPublished(false)
    setCreateIsVisible(true)
    setCreating(false)
    await load({ page: 1 })
  }

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Abonnements</h1>
          <p className="mt-1 text-sm text-gray-600">Plans d’abonnement</p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          className="rounded-xl bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b1220]"
        >
          {createOpen ? "Fermer" : "Créer un plan"}
        </button>
      </div>

      {createOpen ? (
        <div className="card mb-6">
          <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">Code (PUBLIC)</label>
              <input className="input-field" value={createCode} onChange={(e) => setCreateCode(e.target.value)} placeholder="FREE / PRO / BUSINESS" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">Nom</label>
              <input className="input-field" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Nom du plan" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Tier</label>
              <input className="input-field" value={createTier} onChange={(e) => setCreateTier(e.target.value)} placeholder="free / pro / business" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Prix mensuel</label>
              <input
                type="number"
                className="input-field"
                value={createMonthlyPrice}
                onChange={(e) => setCreateMonthlyPrice(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Devise</label>
              <input className="input-field" value={createCurrency} onChange={(e) => setCreateCurrency(e.target.value)} placeholder="XOF" />
            </div>

            <div>
              <label className="text-xs text-gray-500">Crédits/mois</label>
              <input type="number" className="input-field" value={createMonthlyCredits} onChange={(e) => setCreateMonthlyCredits(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Boosts/mois</label>
              <input type="number" className="input-field" value={createMonthlyBoosts} onChange={(e) => setCreateMonthlyBoosts(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Ordre (sortOrder)</label>
              <input type="number" className="input-field" value={createSortOrder} onChange={(e) => setCreateSortOrder(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Badge</label>
              <input className="input-field" value={createBadge} onChange={(e) => setCreateBadge(e.target.value)} placeholder="Le plus populaire" />
            </div>

            <div className="flex items-end gap-2">
              <label className="text-sm font-medium">Publié</label>
              <input type="checkbox" checked={createIsPublished} onChange={(e) => setCreateIsPublished(e.target.checked)} />
            </div>
            <div className="flex items-end gap-2">
              <label className="text-sm font-medium">Visible</label>
              <input type="checkbox" checked={createIsVisible} onChange={(e) => setCreateIsVisible(e.target.checked)} />
            </div>

            <div className="md:col-span-4 flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-[#E8714D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D65A3A] disabled:opacity-50"
              >
                {creating ? "Création…" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="card">
        <form onSubmit={onSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500">Recherche</label>
            <input className="input-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, nom, tier…" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Tier</label>
            <input className="input-field" value={tier} onChange={(e) => setTier(e.target.value)} placeholder="free / pro / business" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Statut</label>
            <select className="input-field" value={isActive} onChange={(e) => setIsActive(e.target.value as any)}>
              <option value="">Tous</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Publié</label>
            <select className="input-field" value={isPublished} onChange={(e) => setIsPublished(e.target.value as any)}>
              <option value="">Tous</option>
              <option value="true">Publié</option>
              <option value="false">Non publié</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Visible</label>
            <select className="input-field" value={isVisible} onChange={(e) => setIsVisible(e.target.value as any)}>
              <option value="">Tous</option>
              <option value="true">Visible</option>
              <option value="false">Masqué</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Archivés</label>
            <select className="input-field" value={archived} onChange={(e) => setArchived(e.target.value as any)}>
              <option value="">Non archivés</option>
              <option value="true">Archivés</option>
              <option value="false">Non archivés</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Tri</label>
            <select className="input-field" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="sortOrder_asc">Ordre (asc)</option>
              <option value="sortOrder_desc">Ordre (desc)</option>
              <option value="monthlyPrice_desc">Prix mensuel (desc)</option>
              <option value="monthlyPrice_asc">Prix mensuel (asc)</option>
              <option value="monthlyCredits_desc">Crédits mensuels (desc)</option>
              <option value="monthlyCredits_asc">Crédits mensuels (asc)</option>
              <option value="updatedAt_desc">MAJ (desc)</option>
              <option value="updatedAt_asc">MAJ (asc)</option>
              <option value="name_asc">Nom (A-Z)</option>
              <option value="name_desc">Nom (Z-A)</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">{data ? `${data.total.toLocaleString("fr-FR")} plan(s)` : ""}</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => load({ page: page })}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                Rafraîchir
              </button>
              <button type="submit" className="rounded-xl bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b1220]">
                Rechercher
              </button>
            </div>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="mt-6 card">
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      ) : null}

      {!loading && !error && data && !data.items.length ? (
        <div className="mt-6 card">
          <p className="text-sm text-gray-500">Aucun plan trouvé.</p>
        </div>
      ) : null}

      {!loading && !error && data && data.items.length ? (
        <div className="mt-6 overflow-x-auto card p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Plan</th>
                <th className="text-left px-4 py-3 font-semibold">Tier</th>
                <th className="text-right px-4 py-3 font-semibold">Prix</th>
                <th className="text-right px-4 py-3 font-semibold">Crédits</th>
                <th className="text-right px-4 py-3 font-semibold">Boosts</th>
                <th className="text-right px-4 py-3 font-semibold">Abonnements</th>
                <th className="text-left px-4 py-3 font-semibold">Actif</th>
                <th className="text-left px-4 py-3 font-semibold">Publié</th>
                <th className="text-left px-4 py-3 font-semibold">Visible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/abonnements/${p.id}`} className="font-semibold text-[#0F172A] hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-xs text-gray-500">{p.code || p.id}</div>
                  </td>
                  <td className="px-4 py-3">{p.tier}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(p.monthlyPrice, p.currency)}</td>
                  <td className="px-4 py-3 text-right">{p.monthlyCredits.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3 text-right">{p.monthlyBoosts.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3 text-right">{p._count.subscriptions.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${p.isActive ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>{p.isActive ? "Oui" : "Non"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${p.isPublished ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>{p.isPublished ? "Oui" : "Non"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${p.isVisible ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>{p.isVisible ? "Oui" : "Non"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data ? (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Page {data.page} / {data.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={async () => {
                const nextPage = Math.max(1, page - 1)
                setPage(nextPage)
                await load({ page: nextPage })
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={async () => {
                const nextPage = page + 1
                setPage(nextPage)
                await load({ page: nextPage })
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
