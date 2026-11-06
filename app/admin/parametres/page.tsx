"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

type Settings = {
  paymentMode: string
  paydunyaEnabled: boolean
  smsProvider: string
  smsConfigured: boolean
  smsSimulation: boolean
}

export default function AdminParametresPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.adminGetSettings().then((res) => {
      if (!res.success) {
        setError(res.error || "Paramètres indisponibles")
        return
      }
      setSettings(res.data as Settings)
    })
  }, [])

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
        </div>
      ) : null}
    </div>
  )
}
