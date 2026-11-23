"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import AuthShell from "@/components/AuthShell"
import { apiClient } from "@/lib/api-client"
import { destinationAfterAuthentication } from "@/lib/role-routing"

export default function ChangeTemporaryPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const token = sessionStorage.getItem("password_change_token")
    if (!token) {
      setError("La session de changement a expiré. Connectez-vous à nouveau.")
      return
    }
    setLoading(true)
    setError(null)
    const res = await apiClient.changeTemporaryPassword(password, token)
    setLoading(false)
    if (!res.success || !res.data?.token) {
      setError(res.error || "Changement impossible")
      return
    }
    sessionStorage.removeItem("password_change_token")
    apiClient.setToken(res.data.token)
    if (res.data.user) apiClient.setUser(res.data.user)
    router.push(destinationAfterAuthentication(res.data.user?.role))
  }

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Le mot de passe temporaire ne sert qu'une fois. Choisissez le mot de passe que vous conserverez.">
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div> : null}
        <input
          className="input-field"
          type="password"
          aria-label="Nouveau mot de passe"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
        <button type="submit" disabled={loading} className="button-primary w-full">
          {loading ? "Enregistrement…" : "Enregistrer et continuer"}
        </button>
      </form>
    </AuthShell>
  )
}
