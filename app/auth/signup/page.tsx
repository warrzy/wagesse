"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signupSchema } from "@/lib/validations"
import { apiClient } from "@/lib/api-client"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

export default function SignupPage() {
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
      const validation = signupSchema.safeParse({
        ...formData,
        role,
      })

      if (!validation.success) {
        const firstError = validation.error.errors[0]
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

      // Store token if provided
      if (response.data?.token) {
        apiClient.setToken(response.data.token)
      }

      // Redirect based on role
      router.push(role === "CLIENT" ? "/dashboard/client" : "/dashboard/trucker")
    } catch (err) {
      setError("Une erreur est survenue")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] to-white pt-20 pb-12">
        <div className="container-max max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold mb-2 text-center">S&apos;inscrire</h1>
            <p className="text-gray-600 text-center mb-8">
              Créez un compte {role === "CLIENT" ? "client" : "camionneur"}
            </p>

            {/* Role Selector */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setRole("CLIENT")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  role === "CLIENT"
                    ? "bg-[#E8714D] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Client
              </button>
              <button
                onClick={() => setRole("TRUCKER")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  role === "TRUCKER"
                    ? "bg-[#E8714D] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Camionneur
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="firstName"
                  placeholder="Prénom"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Nom"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <input
                type="tel"
                name="phone"
                placeholder="Numéro de téléphone"
                value={formData.phone}
                onChange={handleInputChange}
                className="input-field"
                required
              />

              <input
                type="password"
                name="password"
                placeholder="Mot de passe (min 8 caractères)"
                value={formData.password}
                onChange={handleInputChange}
                className="input-field"
                required
              />

              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirmer le mot de passe"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="input-field"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#E8714D] text-white rounded-lg font-semibold hover:bg-[#d45c39] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Inscription en cours..." : "S&apos;inscrire"}
              </button>
            </form>

            {/* Links */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm">
                Vous avez déjà un compte ?{" "}
                <Link href="/auth/login" className="text-[#E8714D] font-semibold hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>

          {/* T&C & Privacy */}
          <p className="text-center text-xs text-gray-500 mt-8">
            En créant un compte, vous acceptez nos{" "}
            <Link href="/terms" className="hover:underline">
              Conditions d&apos;utilisation
            </Link>{" "}
            et{" "}
            <Link href="/privacy" className="hover:underline">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </>
  )
}
