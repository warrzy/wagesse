"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"
import { createVehicleSchema } from "@/lib/validations"
import { Plus } from "lucide-react"

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  DUMP_TRUCK_3_AXLES: "Benne 3 essieux",
  DUMP_TRUCK_4_AXLES: "Benne 4 essieux",
  DUMP_TRUCK_5_AXLES: "Benne 5 essieux",
  TIPPER_TRUCK: "Camion-benne",
  FLATBED: "Plateau",
  CONTAINER_TRUCK: "Porte-conteneurs",
  ARTICULATED_TRUCK: "Semi-remorque",
  OTHER: "Autre",
}

interface Vehicle {
  id: string
  licensePlate: string
  brand: string
  model: string
  year: number
  vehicleType: string
  capacityTonnes: number
  isOperational: boolean
}

export default function TruckerVehiclesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  const [formData, setFormData] = useState({
    licensePlate: "",
    brand: "",
    model: "",
    year: String(new Date().getFullYear()),
    vehicleType: "DUMP_TRUCK_3_AXLES",
    capacityTonnes: "",
  })

  const load = useCallback(async () => {
    const res = await apiClient.getVehicles()
    if (res.success) setVehicles((res.data as Vehicle[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
      return
    }
    load()
  }, [router, load])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const payload = {
        licensePlate: formData.licensePlate,
        brand: formData.brand,
        model: formData.model,
        year: Number(formData.year),
        vehicleType: formData.vehicleType,
        capacityTonnes: Number(formData.capacityTonnes),
      }

      const validation = createVehicleSchema.safeParse(payload)
      if (!validation.success) {
        setError(validation.error.issues[0].message)
        setSubmitting(false)
        return
      }

      const res = await apiClient.createVehicle(payload)
      if (!res.success) {
        setError(res.error || "Erreur lors de l'ajout du véhicule")
        setSubmitting(false)
        return
      }

      setFormData({
        licensePlate: "",
        brand: "",
        model: "",
        year: String(new Date().getFullYear()),
        vehicleType: "DUMP_TRUCK_3_AXLES",
        capacityTonnes: "",
      })
      setShowForm(false)
      await load()
    } catch (err) {
      setError("Une erreur est survenue")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gray-50 pt-8 pb-12">
        <div className="container-max max-w-3xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mes véhicules</h1>
              <p className="text-gray-600">Gérez votre flotte</p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="py-3 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Ajouter un véhicule
            </button>
          </div>

          {showForm && (
            <div className="card mb-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Plaque d&apos;immatriculation</label>
                    <input
                      type="text"
                      name="licensePlate"
                      value={formData.licensePlate}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Type de véhicule</label>
                    <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className="input-field">
                      {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Marque</label>
                    <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="input-field" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Modèle</label>
                    <input type="text" name="model" value={formData.model} onChange={handleChange} className="input-field" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Année</label>
                    <input type="number" name="year" value={formData.year} onChange={handleChange} className="input-field" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Capacité (tonnes)</label>
                    <input
                      type="number"
                      name="capacityTonnes"
                      value={formData.capacityTonnes}
                      onChange={handleChange}
                      className="input-field"
                      min={0}
                      step="0.1"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-[#E8714D] text-white rounded-lg font-medium hover:bg-[#d45c39] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Enregistrement…" : "Enregistrer le véhicule"}
                </button>
              </form>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-500">Chargement…</p>
          ) : vehicles.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">Vous n&apos;avez pas encore de véhicule enregistré.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicles.map((v) => (
                <div key={v.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold">{v.licensePlate}</p>
                    <span className={`badge text-xs ${v.isOperational ? "badge-success" : "badge-warning"}`}>
                      {v.isOperational ? "Disponible" : "Indisponible"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{v.brand} {v.model} ({v.year})</p>
                  <p className="text-sm text-gray-600">{VEHICLE_TYPE_LABELS[v.vehicleType] || v.vehicleType} — {v.capacityTonnes}t</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}
