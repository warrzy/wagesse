"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createTransportRequestSchema } from "@/lib/validations"
import { apiClient } from "@/lib/api-client"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { MATERIAL_TYPES, BF_CITIES, QUANTITY_UNITS, TRUCK_TYPES } from "@/lib/config"

export default function NewRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
    }
  }, [router])

  const [formData, setFormData] = useState({
    material: "",
    quantity: "",
    unit: "TONNES",
    pickupCity: "",
    pickupSector: "",
    dropoffCity: "",
    dropoffSector: "",
    requestedDate: "",
    urgency: "STANDARD",
    minCapacity: "",
    truckTypePreference: "",
    needsDriver: false,
    numberOfTrucks: "1",
    budgetEstimate: "",
    comments: "",
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const showError = (message: string) => {
    setError(message)
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, publish: boolean) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload = {
        material: formData.material,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        pickupCity: formData.pickupCity,
        pickupSector: formData.pickupSector || undefined,
        dropoffCity: formData.dropoffCity,
        dropoffSector: formData.dropoffSector || undefined,
        requestedDate: formData.requestedDate,
        urgency: formData.urgency,
        minCapacity: formData.minCapacity ? Number(formData.minCapacity) : undefined,
        truckTypePreference: formData.truckTypePreference || undefined,
        needsDriver: formData.needsDriver,
        numberOfTrucks: Number(formData.numberOfTrucks),
        budgetEstimate: formData.budgetEstimate ? Number(formData.budgetEstimate) : undefined,
        comments: formData.comments || undefined,
      }

      const validation = createTransportRequestSchema.safeParse(payload)
      if (!validation.success) {
        showError(validation.error.issues[0].message)
        setLoading(false)
        return
      }

      const response = await apiClient.createTransportRequest(payload)
      if (!response.success) {
        showError(response.error || "Erreur lors de la création de la demande")
        setLoading(false)
        return
      }

      const requestId = (response.data as any)?.id
      if (publish && requestId) {
        await apiClient.publishTransportRequest(requestId)
      }

      router.push("/dashboard/client/requests")
    } catch (err) {
      showError("Une erreur est survenue")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gray-50 pt-8 pb-12">
        <div className="container-max max-w-2xl">
          <h1 className="text-3xl font-bold mb-2">Nouvelle demande de transport</h1>
          <p className="text-gray-600 mb-8">Décrivez votre besoin, les camionneurs vous enverront des devis.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="mb-6 p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg text-[#9A3412] text-sm">
            Ne partagez pas vos coordonnées (téléphone, email, liens) dans les champs texte : elles seront automatiquement masquées.
          </div>

          <form className="card space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Matériau</label>
                <select name="material" value={formData.material} onChange={handleChange} className="input-field" required>
                  <option value="">Sélectionner…</option>
                  {MATERIAL_TYPES.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Quantité</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="input-field"
                    min={0}
                    step="0.1"
                    required
                  />
                  <select name="unit" value={formData.unit} onChange={handleChange} className="input-field w-32">
                    {QUANTITY_UNITS.map((u) => (
                      <option key={u.id} value={u.id === "m3" ? "CUBIC_METERS" : u.id === "trips" ? "NUMBER_OF_TRIPS" : u.id === "full_load" ? "FULL_TRUCK_LOAD" : "TONNES"}>
                        {u.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Ville de départ</label>
                <select name="pickupCity" value={formData.pickupCity} onChange={handleChange} className="input-field" required>
                  <option value="">Sélectionner…</option>
                  {BF_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Secteur / quartier (départ)</label>
                <input
                  type="text"
                  name="pickupSector"
                  value={formData.pickupSector}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Optionnel"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Ville de destination</label>
                <select name="dropoffCity" value={formData.dropoffCity} onChange={handleChange} className="input-field" required>
                  <option value="">Sélectionner…</option>
                  {BF_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Secteur / quartier (destination)</label>
                <input
                  type="text"
                  name="dropoffSector"
                  value={formData.dropoffSector}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Optionnel"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Date souhaitée</label>
                <input
                  type="date"
                  name="requestedDate"
                  value={formData.requestedDate}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Urgence</label>
                <select name="urgency" value={formData.urgency} onChange={handleChange} className="input-field">
                  <option value="STANDARD">Standard</option>
                  <option value="URGENT">Urgent</option>
                  <option value="VERY_URGENT">Très urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Type de camion préféré</label>
                <select name="truckTypePreference" value={formData.truckTypePreference} onChange={handleChange} className="input-field">
                  <option value="">Peu importe</option>
                  {TRUCK_TYPES.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Nombre de camions</label>
                <input
                  type="number"
                  name="numberOfTrucks"
                  value={formData.numberOfTrucks}
                  onChange={handleChange}
                  className="input-field"
                  min={1}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Budget estimé (Fr, optionnel)</label>
              <input
                type="number"
                name="budgetEstimate"
                value={formData.budgetEstimate}
                onChange={handleChange}
                className="input-field"
                min={0}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Commentaires</label>
              <textarea
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                className="input-field"
                rows={3}
                placeholder="Précisions utiles pour les camionneurs"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="needsDriver" checked={formData.needsDriver} onChange={handleChange} />
              Chauffeur nécessaire
            </label>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                disabled={loading}
                onClick={(e) => handleSubmit(e as any, false)}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-[#E8714D] transition-colors disabled:opacity-50"
              >
                Enregistrer en brouillon
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={(e) => handleSubmit(e as any, true)}
                className="flex-1 py-3 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors disabled:opacity-50"
              >
                {loading ? "Envoi…" : "Publier la demande"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </>
  )
}
