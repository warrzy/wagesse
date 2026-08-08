"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { Smartphone } from "lucide-react"

interface Payment {
  id: string
  amount: number
  currency: string
  reference: string
  status: string
  type: string
}

export default function PaymentConfirmPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") || "/dashboard/client"

  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [pin, setPin] = useState("")

  const load = useCallback(async () => {
    const res = await apiClient.getPayment(params.id)
    if (res.success) {
      setPayment(res.data as Payment)
    } else {
      setError(res.error || "Paiement introuvable")
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) {
      router.push("/auth/login")
      return
    }
    load()
  }, [router, load])

  const handleConfirm = async () => {
    setError(null)
    if (pin.length !== 4) {
      setError("Entrez votre code PIN à 4 chiffres (simulation sandbox : n'importe quel code fonctionne)")
      return
    }
    setConfirming(true)
    const res = await apiClient.confirmPayment(params.id)
    if (!res.success) {
      setError(res.error || "Le paiement a échoué")
      setConfirming(false)
      return
    }
    router.push(returnTo)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1ED]">
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    )
  }

  if (!payment || payment.status === "SUCCESSFUL") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1ED]">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
          {payment ? (
            <>
              <p className="text-green-600 font-semibold mb-4">Paiement déjà confirmé.</p>
              <button
                onClick={() => router.push(returnTo)}
                className="w-full py-3 bg-[#E8714D] text-white rounded-lg font-semibold hover:bg-[#d45c39] transition-colors"
              >
                Continuer
              </button>
            </>
          ) : (
            <p className="text-red-600">{error || "Paiement introuvable"}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1ED] px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#FF6600] flex items-center justify-center mb-3">
            <Smartphone className="text-white" size={28} />
          </div>
          <h1 className="text-xl font-bold text-center">Orange Money</h1>
          <p className="text-xs text-gray-400 text-center">Environnement sandbox — aucune vraie transaction</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Référence</span>
            <span className="font-medium">{payment.reference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Montant</span>
            <span className="font-bold text-[#E8714D]">
              {payment.amount.toLocaleString("fr-FR")} {payment.currency}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
            {error}
          </div>
        )}

        <label className="text-sm font-medium mb-1 block">Code PIN Orange Money</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
          className="input-field text-center tracking-widest mb-4"
        />

        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="w-full py-3 bg-[#FF6600] text-white rounded-lg font-semibold hover:bg-[#e65c00] transition-colors disabled:opacity-50"
        >
          {confirming ? "Confirmation…" : "Confirmer le paiement"}
        </button>

        <button
          onClick={() => router.back()}
          className="w-full py-2 mt-2 text-gray-500 text-sm hover:underline"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
