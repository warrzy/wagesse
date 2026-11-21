"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

type Settings = {
  paymentMode: string
  paydunyaEnabled: boolean
  smsProvider: string
  smsConfigured: boolean
  smsSimulation: boolean
  quoteCreditCost: number
}

export default function AdminParametresPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [quoteCost, setQuoteCost] = useState("1")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    apiClient.adminGetSettings().then((res) => {
      if (!res.success) {
        setError(res.error || "Paramètres indisponibles")
        return
      }
      const data = res.data as Settings
      setSettings(data)
      setQuoteCost(String(data.quoteCreditCost ?? 1))
    })
  }, [])

  const saveCost = async () => {
    setError(null)
    setSaved(null)
    const res = await apiClient.adminSetQuoteCreditCost(Number(quoteCost))
    if (!res.success) {
      setError(res.error || "Enregistrement impossible")
      return
    }
    setSaved("Coût d’un devis enregistré.")
  }

  return (
    <div className="container-max max-w-3xl">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <p className="mt-2 text-sm text-gray-600">
        État de lancement. Les clés restent dans les variables d’environnement du serveur.
      </p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {!settings && !error ? <p className="mt-4 text-sm text-gray-500">Chargement…</p> : null}
      {settings ? (
        <div className="card mt-6 space-y-3 text-sm">
          <p>Mode de paiement : <span className="font-semibold">{settings.paymentMode}</span></p>
          <p>PayDunya activé : <span className="font-semibold">{settings.paydunyaEnabled ? "oui" : "non"}</span></p>
          <p>SMS : <span className="font-semibold">{settings.smsProvider}</span></p>
          <p>Canal SMS prêt : <span className="font-semibold">{settings.smsConfigured ? "oui" : "non"}</span></p>
          <p>Simulation SMS : <span className="font-semibold">{settings.smsSimulation ? "oui" : "non"}</span></p>
          <div className="border-t border-gray-200 pt-3">
            <p className="font-semibold">Crédits débités pour un devis</p>
            <p className="mt-1 text-gray-600">Valeur serveur. Le navigateur ne peut pas la modifier au moment de l’envoi.</p>
            <div className="mt-3 flex gap-3">
              <input className="input-field max-w-32" inputMode="numeric" value={quoteCost} onChange={(e) => setQuoteCost(e.target.value)} />
              <button type="button" onClick={saveCost} className="rounded-lg bg-[#FF7900] px-4 text-sm font-semibold text-[#071D40]">
                Enregistrer
              </button>
            </div>
            {saved ? <p className="mt-2 text-emerald-700">{saved}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
