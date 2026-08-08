"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
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

export default function AdminCreditPackDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = typeof params?.id === "string" ? params.id : ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pack, setPack] = useState<CreditPack | null>(null)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [editCode, setEditCode] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editPriceXof, setEditPriceXof] = useState<number>(0)
  const [editCredits, setEditCredits] = useState<number>(0)
  const [editBadge, setEditBadge] = useState("")
  const [editIsActive, setEditIsActive] = useState(true)
  const [editSortOrder, setEditSortOrder] = useState<number>(0)

  const onDelete = async () => {
    if (!pack) return
    const ok = window.confirm("Supprimer ce pack ?")
    if (!ok) return

    setDeleting(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminDeleteCreditPack(pack.id)
    if (!res.success) {
      setError(res.error || "Erreur")
      setDeleting(false)
      return
    }

    router.push("/admin/tarifs")
  }

  const load = async () => {
    if (!id) {
      setError("Not found")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminGetCreditPack(id)
    if (!res.success) {
      setError(res.error || "Erreur")
      setLoading(false)
      return
    }

    const p = (res.data as any) as CreditPack
    setPack(p)
    setEditCode(p.code)
    setEditTitle(p.title)
    setEditPriceXof(Number(p.priceXof))
    setEditCredits(Number(p.credits))
    setEditBadge(p.badge || "")
    setEditIsActive(Boolean(p.isActive))
    setEditSortOrder(Number(p.sortOrder || 0))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onSave = async () => {
    if (!pack) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminUpdateCreditPack(pack.id, {
      code: editCode.trim(),
      title: editTitle.trim(),
      priceXof: editPriceXof,
      credits: editCredits,
      badge: editBadge.trim() ? editBadge.trim() : null,
      isActive: editIsActive,
      sortOrder: editSortOrder,
    })

    if (!res.success) {
      setError(res.error || "Erreur")
      setSaving(false)
      return
    }

    setPack((res.data as any) as CreditPack)
    setSuccess("Enregistré")
    setSaving(false)
  }

  return (
    <div className="container-max max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Détails du pack</h1>
          <p className="mt-1 text-sm text-gray-600">Tarifs / Pack</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving || deleting}
            onClick={onSave}
            className="rounded-xl bg-[#E8714D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D65A3A] disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            type="button"
            disabled={saving || deleting}
            onClick={onDelete}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
          <Link
            href="/admin/tarifs"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            Retour
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      ) : null}

      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      ) : null}

      {success ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
      ) : null}

      {!loading && !error && pack ? (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700">Édition</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <label className="text-xs text-gray-500">Code</label>
                <input className="input-field" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500">Titre</label>
                <input className="input-field" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Prix (XOF)</label>
                <input type="number" className="input-field" value={editPriceXof} onChange={(e) => setEditPriceXof(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Crédits</label>
                <input type="number" className="input-field" value={editCredits} onChange={(e) => setEditCredits(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Badge</label>
                <input className="input-field" value={editBadge} onChange={(e) => setEditBadge(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Ordre</label>
                <input type="number" className="input-field" value={editSortOrder} onChange={(e) => setEditSortOrder(Number(e.target.value))} />
              </div>
              <div className="flex items-end gap-2">
                <label className="text-sm font-medium">Actif</label>
                <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
