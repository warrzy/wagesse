"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { loginSchema } from "@/lib/validations"
import { apiClient } from "@/lib/api-client"
import { destinationAfterAuthentication } from "@/lib/role-routing"
import AuthShell from "@/components/AuthShell"

export default function LoginPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const validation = loginSchema.safeParse(formData)

      if (!validation.success) {
        setError(validation.error.issues[0].message)
        setLoading(false)
        return
      }

      const response = await apiClient.login(formData.identifier, formData.password)

      if (!response.success) {
        setError(response.error || "Erreur de connexion")
        setLoading(false)
        return
      }

      if (response.data?.passwordChangeRequired && response.data.token) {
        sessionStorage.setItem("password_change_token", response.data.token)
        router.push("/auth/changer-mot-de-passe")
        return
      }

      if (response.data?.token) {
        apiClient.setToken(response.data.token)
      }
      if (response.data?.user) {
        apiClient.setUser(response.data.user)
      }

      const role = response.data?.user?.role
      router.push(destinationAfterAuthentication(role))
    } catch (err) {
      setError("Une erreur est survenue")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Se connecter" subtitle="Téléphone ou e-mail, puis le mot de passe. Aucun code SMS n’est demandé.">
            <div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="identifier"
                aria-label="Téléphone ou e-mail"
                placeholder="Téléphone ou e-mail"
                value={formData.identifier}
                onChange={handleInputChange}
                className="input-field"
                autoComplete="username"
                required
              />

              <input
                type="password"
                name="password"
                aria-label="Mot de passe"
                placeholder="Mot de passe"
                value={formData.password}
                onChange={handleInputChange}
                className="input-field"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="button-primary w-full"
              >
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm">
              <Link href="/auth/forgot" className="font-semibold text-[#FF7900] hover:underline">
                Mot de passe oublié
              </Link>
            </p>
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm">
                Pas encore de compte ?{" "}
                <Link href="/auth/signup" className="font-semibold text-[#FF7900] hover:underline">
                  S&apos;inscrire
                </Link>
              </p>
            </div>
          </div>
    </AuthShell>
  )
}
