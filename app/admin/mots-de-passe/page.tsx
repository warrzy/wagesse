"use client"

import { FormEvent, useState } from "react"
import { apiClient } from "@/lib/api-client"

type Account = {
  id: string
  phone: string
  email: string
  role: string
  status: string
  phoneVerified: boolean
  passwordMustChange: boolean
  temporaryPasswordActive: boolean
}

type ResetResult = {
  temporaryPassword: string
  expiresAt: string
  delivery: string
}

export default function AdminPasswordResetPage() {
  const [identifier, setIdentifier] = useState("")
  const [account, setAccount] = useState<Account | null>(null)
  const [method, setMethod] = useState("IN_PERSON")
  const [note, setNote] = useState("")
  const [confirm, setConfirm] = useState(false)
  const [doubt, setDoubt] = useState(false)
  const [phrase, setPhrase] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResetResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const search = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setResult(null)
    setMessage(null)
    setAccount(null)
    const res = await apiClient.adminFindAccount(identifier)
    if (!res.success) {
      setError(res.error || "Compte introuvable")
      return
    }
    setAccount(res.data as Account)
  }

  const reset = async (event: FormEvent) => {
    event.preventDefault()
    if (!account) return
    setError(null)
    setResult(null)
    const res = await apiClient.adminResetPassword({
      identifier,
      confirm: true,
      identityDoubt: doubt,
      identityMethod: method,
      identityNote: note,
      confirmationPhrase: account.role === "SUPER_ADMIN" ? phrase : undefined,
    })
    if (!res.success) {
      setError(res.error || "Réinitialisation refusée")
      return
    }
    setConfirm(false)
    setResult(res.data as ResetResult)
    setMessage(res.message || null)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#071D40]">Réinitialisation de mot de passe</h1>
        <p className="mt-2 text-sm text-gray-600">
          Le mot de passe temporaire s&apos;affiche une seule fois. Il n&apos;est pas envoyé automatiquement et ne doit pas être recopié dans le journal.
          En cas de doute sur l&apos;identité, n&apos;effectuez pas l&apos;opération.
        </p>
      </div>

      <form onSubmit={search} className="rounded-xl bg-white p-5 shadow-sm space-y-3">
        <label className="block text-sm font-semibold" htmlFor="identifier">Téléphone ou e-mail</label>
        <div className="flex gap-3">
          <input id="identifier" className="input-field" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
          <button className="rounded-lg bg-[#071D40] px-4 text-white font-semibold" type="submit">Rechercher</button>
        </div>
      </form>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {account ? (
        <form onSubmit={reset} className="rounded-xl bg-white p-5 shadow-sm space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">Rôle</dt><dd className="font-semibold">{account.role}</dd></div>
            <div><dt className="text-gray-500">Statut</dt><dd className="font-semibold">{account.status}</dd></div>
            <div><dt className="text-gray-500">Téléphone vérifié</dt><dd className="font-semibold">{account.phoneVerified ? "oui" : "non"}</dd></div>
            <div><dt className="text-gray-500">Changement obligatoire</dt><dd className="font-semibold">{account.passwordMustChange ? "oui" : "non"}</dd></div>
          </dl>
          <label className="block text-sm font-semibold" htmlFor="method">Contrôle d&apos;identité hors plateforme</label>
          <select id="method" className="input-field" value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="IN_PERSON">Présence physique</option>
            <option value="PHONE_CALLBACK">Rappel sur un numéro déjà connu</option>
            <option value="IDENTITY_DOCUMENT">Pièce d&apos;identité</option>
          </select>
          <textarea className="input-field min-h-24" aria-label="Note de contrôle" placeholder="Ce qui a été vérifié, sans mot de passe" value={note} onChange={(event) => setNote(event.target.value)} required />
          {account.role === "SUPER_ADMIN" ? (
            <input className="input-field" aria-label="Phrase de confirmation super administrateur" placeholder="Phrase de la procédure renforcée" value={phrase} onChange={(event) => setPhrase(event.target.value)} />
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={doubt} onChange={(event) => setDoubt(event.target.checked)} />
            J&apos;ai un doute sur l&apos;identité
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />
            Je confirme cette réinitialisation
          </label>
          <button type="submit" disabled={!confirm || doubt} className="rounded-lg bg-[#FF7900] px-4 py-3 font-semibold text-[#071D40] disabled:opacity-50">
            Générer un mot de passe temporaire
          </button>
        </form>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="font-semibold text-[#071D40]">Mot de passe temporaire</p>
          <p className="mt-3 font-mono text-lg break-all">{result.temporaryPassword}</p>
          <p className="mt-3 text-sm text-gray-700">{message}</p>
          <p className="mt-2 text-sm text-gray-700">Expiration : {new Date(result.expiresAt).toLocaleString("fr-FR", { timeZone: "Africa/Ouagadougou" })} (Ouagadougou). Cinq essais au plus. Les sessions précédentes sont fermées.</p>
        </div>
      ) : null}
    </div>
  )
}
