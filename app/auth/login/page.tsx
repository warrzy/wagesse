"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { loginSchema } from "@/lib/validations"
import { apiClient } from "@/lib/api-client"
import { getDashboardRouteByRole } from "@/lib/role-routing"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

export default function LoginPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    phone: "",
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

      const response = await apiClient.login(formData.phone, formData.password)

      if (!response.success) {
        setError(response.error || "Erreur de connexion")
        setLoading(false)
        return
      }

      if (response.data?.token) {
        apiClient.setToken(response.data.token)
      }
      if (response.data?.user) {
        apiClient.setUser(response.data.user)
      }

      if (response.data?.user && response.data.user.phoneVerified == null) {
        router.push(`/auth/verify?phone=${encodeURIComponent(response.data.user.phone)}`)
        return
      }

      const role = response.data?.user?.role
      router.push(getDashboardRouteByRole(role))
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
            <h1 className="text-3xl font-bold mb-2 text-center">Se connecter</h1>
            <p className="text-gray-600 text-center mb-8">
              Accédez à votre espace Wagesse
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="tel"
                name="phone"
                aria-label="Numéro de téléphone"
                placeholder="Numéro de téléphone"
                value={formData.phone}
                onChange={handleInputChange}
                className="input-field"
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
                className="w-full py-3 bg-[#E8714D] text-white rounded-lg font-semibold hover:bg-[#d45c39] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm">
                Pas encore de compte ?{" "}
                <Link href="/auth/signup" className="text-[#E8714D] font-semibold hover:underline">
                  S&apos;inscrire
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
