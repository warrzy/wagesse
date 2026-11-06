"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { apiClient } from "@/lib/api-client"

export default function TruckerProfilePage() {
  const router = useRouter()
  const [city, setCity] = useState("Ouagadougou")
  const [operatingLicense, setOperatingLicense] = useState("")
  const [orangeMoneyNumber, setOrangeMoneyNumber] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!apiClient.getToken()) {
      router.push("/auth/login")
      return
    }
    apiClient.getTruckerProfile().then((res) => {
      if (!res.success) {
        setError(res.error || "Profil introuvable")
        setLoading(false)
        return
      }
      const profile = res.data as { city?: string; operatingLicense?: string | null; orangeMoneyNumber?: string | null }
      setCity(profile.city || "Ouagadougou")
      setOperatingLicense(profile.operatingLicense || "")
      setOrangeMoneyNumber(profile.orangeMoneyNumber || "")
      setLoading(false)
    })
  }, [router])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setInfo(null)
    const res = await apiClient.updateTruckerProfile({ city, operatingLicense, orangeMoneyNumber })
    setSaving(false)
    if (!res.success) {
      setError(res.error || "Enregistrement impossible")
      return
    }
    setInfo("Profil enregistré")
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-10 pb-16">
        <div className="container-max max-w-xl">
          <h1 className="text-2xl font-bold">Mon profil transporteur</h1>
          {loading ? <p className="mt-4 text-sm text-gray-500">Chargement…</p> : null}
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {info ? <p className="mt-4 text-sm text-green-700">{info}</p> : null}
          {!loading ? (
            <form onSubmit={save} className="card mt-6 space-y-4">
              <input className="input-field" aria-label="Ville" value={city} onChange={(e) => setCity(e.target.value)} required />
              <input className="input-field" aria-label="Permis" placeholder="Permis d'exploitation" value={operatingLicense} onChange={(e) => setOperatingLicense(e.target.value)} />
              <input className="input-field" aria-label="Orange Money" placeholder="Numéro Orange Money" value={orangeMoneyNumber} onChange={(e) => setOrangeMoneyNumber(e.target.value)} />
              <button type="submit" disabled={saving} className="w-full py-3 bg-[#E8714D] text-white rounded-lg font-semibold disabled:opacity-50">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </form>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  )
}
