"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"
import { createQuoteSchema } from "@/lib/validations"
import { Lock } from "lucide-react"

interface RequestDetail {
  id: string
  materialDescription: string | null
  quantity: number
  unit: string
  pickupCity: string
  pickupSector: string | null
  dropoffCity: string
  dropoffSector: string | null
  requestedDate: string
  notes: string | null
  status: string
  customer: { user: { firstName: string | null; lastName: string | null; phone: string; email: string } }
  customerContactsUnlocked?: boolean
}

interface Vehicle {
  id: string
  licensePlate: string
  brand: string
  model: string
  capacityTonnes: number
}

interface ExistingQuote {
  id: string
  totalPrice: number
  status: string
}

export default function TruckerRequestDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [existingQuote, setExistingQuote] = useState<ExistingQuote | null>(null)

  const [formData, setFormData] = useState({
    vehicleId: "",
    totalPrice: "",
    proposedDate: "",
    validUntil: "",
    comments: "",
  })

  const load = useCallback(async () => {
    const [reqRes, vehiclesRes, quotesRes] = await Promise.all([
      apiClient.getTransportRequest(params.id),
      apiClient.getVehicles(),
      apiClient.getQuotes({ requestId: params.id }),
    ])

    if (reqRes.success) setRequest(reqRes.data as any)
    else setError(reqRes.error || "Demande introuvable")

    if (vehiclesRes.success) setVehicles((vehiclesRes.data as Vehicle[]) || [])

    if (quotesRes.success) {
      const own = ((quotesRes.data as any[]) || [])[0]
      if (own) setExistingQuote(own)
    }

    setLoading(false)
  }, [params.id])

  const handleUnlockCustomerContact = async () => {
    setActionLoading(true)
    setError(null)

    const res = await (apiClient as any).request(
      "POST",
      `/requests/${params.id}/unlock-customer-contact`,
      {}
    )

    if (!res.success) {
      if (res.code === "INSUFFICIENT_CREDITS") {
        setError("Vous n'avez plus suffisamment de crédits. Achetez des crédits pour accéder à ce contact.")
      } else {
        setError(res.error || "Erreur lors du déblocage")
      }
      setActionLoading(false)
      return
    }

    await load()
    setActionLoading(false)
  }

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
      return
    }
    load()
  }, [router, load])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const payload = {
        requestId: params.id,
        vehicleId: formData.vehicleId,
        totalPrice: Number(formData.totalPrice),
        proposedDate: formData.proposedDate,
        validUntil: formData.validUntil,
        comments: formData.comments || undefined,
      }

      const validation = createQuoteSchema.safeParse(payload)
      if (!validation.success) {
        setError(validation.error.issues[0].message)
        setSubmitting(false)
        return
      }

      const res = await apiClient.createQuote(payload)
      if (!res.success) {
        setError(res.error || "Erreur lors de l'envoi du devis")
        setSubmitting(false)
        return
      }

      router.push("/dashboard/trucker")
    } catch (err) {
      setError("Une erreur est survenue")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-8 pb-12">
          <div className="container-max">
            <p className="text-sm text-gray-500">Chargement…</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!request) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-8 pb-12">
          <div className="container-max">
            <p className="text-red-600">{error || "Demande introuvable"}</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gray-50 pt-8 pb-12">
        <div className="container-max max-w-2xl">
          <div className="card mb-6">
            <h1 className="text-2xl font-bold mb-1">
              {request.materialDescription || "Matériau non précisé"} — {request.quantity} {request.unit}
            </h1>
            <p className="text-gray-600 mb-1">
              {request.pickupCity}{request.pickupSector ? `, ${request.pickupSector}` : ""} → {request.dropoffCity}{request.dropoffSector ? `, ${request.dropoffSector}` : ""}
            </p>
            <p className="text-sm text-gray-500 mb-1">
              Date souhaitée : {new Date(request.requestedDate).toLocaleDateString("fr-FR")}
            </p>
            <p className="text-sm text-gray-500">
              Client : {request.customer?.user?.firstName} {request.customer?.user?.lastName}
            </p>

            <div className="mt-4 rounded-xl border border-gray-200 bg-[#F8FAFC] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Coordonnées</p>
                  <p className="mt-2 text-sm text-gray-700">Téléphone : {request.customer.user.phone}</p>
                  <p className="text-sm text-gray-700">Email : {request.customer.user.email}</p>
                </div>

                {!request.customerContactsUnlocked && (
                  <button
                    type="button"
                    onClick={handleUnlockCustomerContact}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0F172A] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#0b1220] transition-colors disabled:opacity-50"
                  >
                    <Lock size={14} />
                    Débloquer (1 crédit)
                  </button>
                )}
              </div>

              {!request.customerContactsUnlocked && (
                <p className="mt-3 text-xs text-gray-500">
                  Celui qui initie le contact paie 1 crédit. Un contact déjà débloqué n’est jamais facturé deux fois.
                </p>
              )}

              {error && error.includes("crédits") && (
                <div className="mt-3">
                  <Link href="/pricing" className="text-sm font-semibold text-[#E8714D] hover:underline">
                    Acheter des crédits
                  </Link>
                </div>
              )}
            </div>

            {request.notes && <p className="text-sm text-gray-600 mt-3">{request.notes}</p>}
          </div>

          {existingQuote ? (
            <div className="card">
              <h2 className="text-xl font-semibold mb-2">Votre devis</h2>
              <p className="text-gray-700">
                {existingQuote.totalPrice.toLocaleString("fr-FR")} Fr — <span className="badge text-xs">{existingQuote.status}</span>
              </p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500 mb-4">Vous devez enregistrer un véhicule avant de pouvoir envoyer un devis.</p>
              <Link href="/dashboard/trucker/vehicles" className="text-[#E8714D] font-medium hover:underline">
                Ajouter un véhicule
              </Link>
            </div>
          ) : (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Envoyer un devis</h2>

              <div className="mb-4 p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg text-[#9A3412] text-sm">
                Ne partagez pas vos coordonnées (téléphone, email, liens) dans les champs texte : elles seront automatiquement masquées.
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Véhicule</label>
                  <select name="vehicleId" value={formData.vehicleId} onChange={handleChange} className="input-field" required>
                    <option value="">Sélectionner…</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.brand} {v.model} ({v.licensePlate}) — {v.capacityTonnes}t
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Prix proposé (Fr)</label>
                  <input
                    type="number"
                    name="totalPrice"
                    value={formData.totalPrice}
                    onChange={handleChange}
                    className="input-field"
                    min={0}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Date proposée</label>
                    <input
                      type="date"
                      name="proposedDate"
                      value={formData.proposedDate}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Devis valable jusqu&apos;au</label>
                    <input
                      type="date"
                      name="validUntil"
                      value={formData.validUntil}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Commentaires</label>
                  <textarea
                    name="comments"
                    value={formData.comments}
                    onChange={handleChange}
                    className="input-field"
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Envoi…" : "Envoyer le devis"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}
