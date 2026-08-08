"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"

type CreditPack = {
  id: string
  code: string
  title: string
  priceXof: number
  credits: number
  badge: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

function toBool(s: string): boolean | undefined {
  if (s === "true") return true
  if (s === "false") return false
  return undefined
}

export default function AdminTarifsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<CreditPack[]>([])
  const [total, setTotal] = useState(0)

  const [q, setQ] = useState("")
  const [isActive, setIsActive] = useState<string>("")
  const [sort, setSort] = useState("sortOrder_asc")

  const [creating, setCreating] = useState(false)
  const [createCode, setCreateCode] = useState("")
  const [createTitle, setCreateTitle] = useState("")
  const [createPriceXof, setCreatePriceXof] = useState<number>(1000)
  const [createCredits, setCreateCredits] = useState<number>(1)
  const [createBadge, setCreateBadge] = useState("")
  const [createIsActive, setCreateIsActive] = useState(true)
  const [createSortOrder, setCreateSortOrder] = useState<number>(0)

  const query = useMemo(
    () => ({ q: q.trim() || undefined, isActive: toBool(isActive), sort }),
    [q, isActive, sort]
  )

  const load = async () => {
    setLoading(true)
    setError(null)
    const res = await apiClient.adminListCreditPacks({ page: 1, pageSize: 100, ...query })
    if (!res.success) {
      setError(res.error || "Erreur")
      setLoading(false)
      return
    }

    const data = (res.data as any) || {}
    setItems((data.items as CreditPack[]) || [])
    setTotal(Number(data.total || 0))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.q, query.isActive, query.sort])

  const onCreate = async () => {
    setCreating(true)
    setError(null)

    const res = await apiClient.adminCreateCreditPack({
      code: createCode.trim(),
      title: createTitle.trim(),
      priceXof: createPriceXof,
      credits: createCredits,
      badge: createBadge.trim() ? createBadge.trim() : null,
      isActive: createIsActive,
      sortOrder: createSortOrder,
    })

    if (!res.success) {
      setError(res.error || "Erreur")
      setCreating(false)
      return
    }

    setCreateCode("")
    setCreateTitle("")
    setCreatePriceXof(1000)
    setCreateCredits(1)
    setCreateBadge("")
    setCreateIsActive(true)
    setCreateSortOrder(0)
    setCreating(false)
    await load()
  }

  return (
    <div className="container-max max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tarifs</h1>
          <p className="mt-1 text-sm text-gray-600">Packs d'achat de crédits</p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      ) : null}

      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-700">Créer un pack</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-gray-500">Code</label>
            <input className="input-field" value={createCode} onChange={(e) => setCreateCode(e.target.value)} placeholder="PACK_5" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500">Titre</label>
            <input className="input-field" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Pack 5" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Prix (XOF)</label>
            <input type="number" className="input-field" value={createPriceXof} onChange={(e) => setCreatePriceXof(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Crédits</label>
            <input type="number" className="input-field" value={createCredits} onChange={(e) => setCreateCredits(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Badge</label>
            <input className="input-field" value={createBadge} onChange={(e) => setCreateBadge(e.target.value)} placeholder="Populaire" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Ordre</label>
            <input type="number" className="input-field" value={createSortOrder} onChange={(e) => setCreateSortOrder(Number(e.target.value))} />
          </div>
          <div className="flex items-end gap-2">
            <label className="text-sm font-medium">Actif</label>
            <input type="checkbox" checked={createIsActive} onChange={(e) => setCreateIsActive(e.target.checked)} />
          </div>
          <div className="md:col-span-5 flex items-end justify-end">
            <button
              type="button"
              disabled={creating}
              onClick={onCreate}
              className="rounded-xl bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b1220] disabled:opacity-50"
            >
              {creating ? "Création…" : "Créer"}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
            <div>
              <label className="text-xs text-gray-500">Recherche</label>
              <input className="input-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, titre..." />
            </div>
            <div>
              <label className="text-xs text-gray-500">Statut</label>
              <select className="input-field" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
                <option value="">Tous</option>
                <option value="true">Actifs</option>
                <option value="false">Inactifs</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Tri</label>
              <select className="input-field" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="sortOrder_asc">Ordre (asc)</option>
                <option value="sortOrder_desc">Ordre (desc)</option>
                <option value="price_asc">Prix (asc)</option>
                <option value="price_desc">Prix (desc)</option>
                <option value="credits_asc">Crédits (asc)</option>
                <option value="credits_desc">Crédits (desc)</option>
                <option value="createdAt_desc">Créé (desc)</option>
                <option value="createdAt_asc">Créé (asc)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            Rafraîchir
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">{total.toLocaleString("fr-FR")} pack(s)</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3">Pack</th>
                <th className="px-4 py-3">Prix</th>
                <th className="px-4 py-3">Crédits</th>
                <th className="px-4 py-3">Actif</th>
                <th className="px-4 py-3">Ordre</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={6}>
                    Chargement…
                  </td>
                </tr>
              ) : items.length ? (
                items.map((it) => (
                  <tr key={it.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        <Link href={`/admin/tarifs/${it.id}`} className="hover:underline">
                          {it.title}
                        </Link>
                      </div>
                      <div className="text-xs text-gray-500">{it.code}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{Number(it.priceXof).toLocaleString("fr-FR")} XOF</td>
                    <td className="px-4 py-3 text-gray-700">{Number(it.credits).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          it.isActive ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {it.isActive ? "Oui" : "Non"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{it.sortOrder}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={6}>
                    Aucun pack
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
