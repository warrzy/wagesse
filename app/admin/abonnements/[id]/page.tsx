"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"

type PlanDetails = {
  id: string
  code: string | null
  name: string
  tier: string
  description: string | null
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

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR")} ${currency}`
}

export default function AdminAbonnementPlanDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = typeof params?.id === "string" ? params.id : ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<PlanDetails | null>(null)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const [editCode, setEditCode] = useState<string>("")
  const [editName, setEditName] = useState("")
  const [editTier, setEditTier] = useState("")
  const [editMonthlyPrice, setEditMonthlyPrice] = useState<number>(0)
  const [editCurrency, setEditCurrency] = useState("XOF")
  const [editIsActive, setEditIsActive] = useState(true)
  const [editIsPublished, setEditIsPublished] = useState(false)
  const [editIsVisible, setEditIsVisible] = useState(true)
  const [editBadge, setEditBadge] = useState("")
  const [editSortOrder, setEditSortOrder] = useState<number>(0)
  const [editMonthlyCredits, setEditMonthlyCredits] = useState<number>(0)
  const [editMonthlyBoosts, setEditMonthlyBoosts] = useState<number>(0)
  const [editBenefits, setEditBenefits] = useState("")

  const load = async () => {
    if (!id) {
      setError("Not found")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminGetAbonnementPlan(id)
    if (!res.success) {
      setError(res.error || "Erreur")
      setLoading(false)
      return
    }

    const p = (res.data as any) as PlanDetails
    setPlan(p)
    setEditCode(p.code || "")
    setEditName(p.name)
    setEditTier(p.tier)
    setEditMonthlyPrice(p.monthlyPrice)
    setEditCurrency(p.currency)
    setEditIsActive(p.isActive)
    setEditIsPublished(Boolean((p as any).isPublished))
    setEditIsVisible(Boolean((p as any).isVisible))
    setEditBadge(((p as any).badge ?? "") as string)
    setEditSortOrder(Number((p as any).sortOrder ?? 0))
    setEditMonthlyCredits(Number((p as any).monthlyCredits ?? 0))
    setEditMonthlyBoosts(Number((p as any).monthlyBoosts ?? 0))
    const benefits = Array.isArray((p as any).benefits) ? ((p as any).benefits as any[]).map((x) => String(x)).join("\n") : ""
    setEditBenefits(benefits)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onSave = async () => {
    if (!plan) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminUpdateAbonnementPlan(plan.id, {
      code: editCode.trim() || null,
      name: editName,
      tier: editTier,
      monthlyPrice: editMonthlyPrice,
      currency: editCurrency,
      isActive: editIsActive,
      isPublished: editIsPublished,
      isVisible: editIsVisible,
      badge: editBadge.trim() || null,
      sortOrder: editSortOrder,
      monthlyCredits: editMonthlyCredits,
      monthlyBoosts: editMonthlyBoosts,
      benefits: editBenefits
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    })

    if (!res.success) {
      setError(res.error || "Erreur")
      setSaving(false)
      return
    }

    setPlan((res.data as any) as PlanDetails)
    setEditing(false)
    setSuccess("Enregistré")
    setSaving(false)
  }

  const onArchive = async () => {
    if (!plan) return
    const ok = window.confirm("Archiver ce plan ? Il ne sera plus visible sur le site (historique conservé).")
    if (!ok) return

    setArchiving(true)
    setError(null)
    setSuccess(null)

    const res = await apiClient.adminUpdateAbonnementPlan(plan.id, { archive: true })
    if (!res.success) {
      setError(res.error || "Erreur")
      setArchiving(false)
      return
    }

    setPlan((res.data as any) as PlanDetails)
    setEditIsActive(false)
    setEditIsPublished(false)
    setEditing(false)
    setSuccess("Plan archivé")
    setArchiving(false)
  }

  return (
    <div className="container-max max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Détails du plan</h1>
          <p className="mt-1 text-sm text-gray-600">Abonnement / Plan</p>
        </div>
        <div className="flex gap-2">
          {plan ? (
            <button
              type="button"
              onClick={() => {
                if (!plan) return
                setEditing((v) => !v)
                setError(null)
                setSuccess(null)
                setEditCode(plan.code || "")
                setEditName(plan.name)
                setEditTier(plan.tier)
                setEditMonthlyPrice(plan.monthlyPrice)
                setEditCurrency(plan.currency)
                setEditIsActive(plan.isActive)
                setEditIsPublished(Boolean((plan as any).isPublished))
                setEditIsVisible(Boolean((plan as any).isVisible))
                setEditBadge(((plan as any).badge ?? "") as string)
                setEditSortOrder(Number((plan as any).sortOrder ?? 0))
                setEditMonthlyCredits(Number((plan as any).monthlyCredits ?? 0))
                setEditMonthlyBoosts(Number((plan as any).monthlyBoosts ?? 0))
                const benefits = Array.isArray((plan as any).benefits) ? ((plan as any).benefits as any[]).map((x) => String(x)).join("\n") : ""
                setEditBenefits(benefits)
              }}
              className="rounded-xl bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b1220]"
            >
              {editing ? "Annuler" : "Modifier"}
            </button>
          ) : null}
          {plan ? (
            <button
              type="button"
              disabled={archiving || saving}
              onClick={onArchive}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              {archiving ? "Désactivation…" : "Désactiver"}
            </button>
          ) : null}
          <Link
            href="/admin/abonnements"
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

      {!loading && !error && plan ? (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">{plan.name}</h2>
                <p className="mt-1 text-sm text-gray-600">{plan.code || plan.id}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                  plan.isActive ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-600 border border-gray-200"
                }`}
              >
                {plan.isActive ? "Actif" : "Inactif"}
              </span>
            </div>

            {plan.description ? <p className="mt-4 text-sm text-gray-700">{plan.description}</p> : null}
          </div>

          {editing ? (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700">Modification</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Code (PUBLIC)</label>
                  <input className="input-field" value={editCode} onChange={(e) => setEditCode(e.target.value)} placeholder="FREE / PRO / BUSINESS" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">Nom</label>
                  <input className="input-field" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Tier</label>
                  <input className="input-field" value={editTier} onChange={(e) => setEditTier(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Prix mensuel</label>
                  <input type="number" className="input-field" value={editMonthlyPrice} onChange={(e) => setEditMonthlyPrice(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Devise</label>
                  <input className="input-field" value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <label className="text-sm font-medium">Actif</label>
                  <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
                </div>

                <div className="flex items-end gap-2">
                  <label className="text-sm font-medium">Publié</label>
                  <input type="checkbox" checked={editIsPublished} onChange={(e) => setEditIsPublished(e.target.checked)} />
                </div>

                <div className="flex items-end gap-2">
                  <label className="text-sm font-medium">Visible</label>
                  <input type="checkbox" checked={editIsVisible} onChange={(e) => setEditIsVisible(e.target.checked)} />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Badge</label>
                  <input className="input-field" value={editBadge} onChange={(e) => setEditBadge(e.target.value)} placeholder="Le plus populaire" />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Ordre (sortOrder)</label>
                  <input type="number" className="input-field" value={editSortOrder} onChange={(e) => setEditSortOrder(Number(e.target.value))} />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Crédits/mois</label>
                  <input type="number" className="input-field" value={editMonthlyCredits} onChange={(e) => setEditMonthlyCredits(Number(e.target.value))} />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Boosts/mois</label>
                  <input type="number" className="input-field" value={editMonthlyBoosts} onChange={(e) => setEditMonthlyBoosts(Number(e.target.value))} />
                </div>

                <div className="md:col-span-5">
                  <label className="text-xs text-gray-500">Avantages (1 par ligne)</label>
                  <textarea className="input-field" rows={6} value={editBenefits} onChange={(e) => setEditBenefits(e.target.value)} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={onSave}
                  className="rounded-xl bg-[#E8714D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D65A3A] disabled:opacity-50"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700">Tarification</h3>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Mensuel</p>
                  <p className="font-semibold">{formatMoney(plan.monthlyPrice, plan.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Annuel</p>
                  <p className="font-semibold">{plan.annualPrice ? formatMoney(plan.annualPrice, plan.currency) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Essai</p>
                  <p className="font-semibold">{plan.trialDays.toLocaleString("fr-FR")} jour(s)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Commission plateforme</p>
                  <p className="font-semibold">{Math.round(plan.platformCommissionRate * 1000) / 10}%</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700">Crédits & limites</h3>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Crédits/mois</p>
                  <p className="font-semibold">{plan.monthlyCredits.toLocaleString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Coût déblocage</p>
                  <p className="font-semibold">{plan.unlockCostCredits.toLocaleString("fr-FR")} crédit(s)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Boosts/mois</p>
                  <p className="font-semibold">{plan.monthlyBoosts.toLocaleString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cycle</p>
                  <p className="font-semibold">{plan.cycleDays.toLocaleString("fr-FR")} jour(s)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Véhicules max</p>
                  <p className="font-semibold">{plan.maxVehicles.toLocaleString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Demandes max</p>
                  <p className="font-semibold">{plan.maxRequests === null ? "Illimité" : plan.maxRequests.toLocaleString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Propositions max</p>
                  <p className="font-semibold">{plan.maxProposals === null ? "Illimité" : plan.maxProposals.toLocaleString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Abonnements</p>
                  <p className="font-semibold">{plan._count.subscriptions.toLocaleString("fr-FR")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700">Avantages</h3>
              <div className="mt-4 text-sm text-gray-700">
                {Array.isArray(plan.benefits) && plan.benefits.length ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {plan.benefits.map((b: any, idx: number) => (
                      <li key={idx}>{String(b)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">—</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700">Features</h3>
              <div className="mt-4 text-sm text-gray-700">
                {Array.isArray(plan.features) && plan.features.length ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {plan.features.map((f: any, idx: number) => (
                      <li key={idx}>{String(f)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">—</p>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700">Métadonnées</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Créé</p>
                <p className="font-semibold">{new Date(plan.createdAt).toLocaleString("fr-FR")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Mis à jour</p>
                <p className="font-semibold">{new Date(plan.updatedAt).toLocaleString("fr-FR")}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
