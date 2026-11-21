"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signupFormSchema } from "@/lib/validations"
import { apiClient } from "@/lib/api-client"
import { destinationAfterAuthentication } from "@/lib/role-routing"
import AuthShell from "@/components/AuthShell"

export default function SignupClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = (searchParams.get("role") as "CLIENT" | "TRUCKER") || "CLIENT"

  const [role, setRole] = useState<"CLIENT" | "TRUCKER">(defaultRole)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
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
      const validation = signupFormSchema.safeParse({
        ...formData,
        role,
      })

      if (!validation.success) {
        const firstError = validation.error.issues[0]
        setError(firstError.message)
        setLoading(false)
        return
      }

      const response = await apiClient.signup({
        phone: formData.phone,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role,
      })

      if (!response.success) {
        setError(response.error || "Erreur lors de l'inscription")
        setLoading(false)
        return
      }

      if (response.data?.token) {
        apiClient.setToken(response.data.token)
      }
      if (response.data?.user) {
        apiClient.setUser(response.data.user)
      }

      const userRole = response.data?.user?.role
      router.push(destinationAfterAuthentication(userRole))
    } catch (err) {
      setError("Une erreur est survenue")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle={role === "CLIENT" ? "Compte client : publier une demande et comparer les devis." : "Compte transporteur : répondre aux demandes depuis le téléphone."}
    >
            <div>

            <div className="flex gap-4 mb-8">
              <button
                type="button"
                onClick={() => setRole("CLIENT")}
                className={`min-h-12 flex-1 rounded-xl px-4 font-semibold ${
                  role === "CLIENT" ? "bg-[#071D40] text-white" : "bg-[#F4F8FC] text-[#071D40]"
                }`}
              >
                Client
              </button>
              <button
                type="button"
                onClick={() => setRole("TRUCKER")}
                className={`min-h-12 flex-1 rounded-xl px-4 font-semibold ${
                  role === "TRUCKER" ? "bg-[#071D40] text-white" : "bg-[#F4F8FC] text-[#071D40]"
                }`}
              >
                Camionneur
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="70 00 00 00"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Votre prénom"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Votre nom"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="input-field"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Inscription..." : "S'inscrire"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Déjà un compte ?{" "}
                <Link href="/auth/login" className="font-semibold text-[#FF7900] hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                En vous inscrivant, vous acceptez nos{" "}
                <Link href="/legal/terms" className="underline hover:text-gray-700">
                  Conditions d’utilisation
                </Link>{" "}
                et notre{" "}
                <Link href="/legal/privacy" className="underline hover:text-gray-700">
                  Politique de confidentialité
                </Link>
              </p>
            </div>
          </div>
    </AuthShell>
  )
}
