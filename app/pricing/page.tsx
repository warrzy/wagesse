import Link from "next/link"
import { prisma } from "@/lib/prisma"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import PricingSuccessBanner from "@/app/pricing/PricingSuccessBanner"

export const dynamic = "force-dynamic"
export const revalidate = 0

function formatXof(amount: number) {
  return `${Number(amount || 0).toLocaleString("fr-FR")} FCFA`
}

function isPopularBadge(badge: string | null | undefined) {
  const s = String(badge || "").toLowerCase()
  return s.includes("populaire")
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const sp = searchParams || {}
  const success = sp.success === "1" || (Array.isArray(sp.success) && sp.success[0] === "1")
  const tabRaw = sp.tab
  const tab = (Array.isArray(tabRaw) ? tabRaw[0] : tabRaw) === "packs" ? "packs" : "subscriptions"

  const db = prisma as any

  let plans: Array<{
    id: string
    code: string | null
    name: string
    monthlyPrice: number
    currency: string
    monthlyCredits: number
    unlockCostCredits: number
    monthlyBoosts: number
    cycleDays: number
    sortOrder: number
    badge?: string | null
    benefits?: any
  }> = []
  try {
    if (db?.subscriptionPlan?.findMany) {
      plans = (await db.subscriptionPlan.findMany({
        where: {
          isActive: true,
          isPublished: true,
          isVisible: true,
          archivedAt: null,
        },
        orderBy: [{ sortOrder: "asc" }, { monthlyPrice: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          monthlyPrice: true,
          currency: true,
          monthlyCredits: true,
          unlockCostCredits: true,
          monthlyBoosts: true,
          cycleDays: true,
          sortOrder: true,
          badge: true,
          benefits: true,
        },
      })) as any
    }
  } catch {
    plans = []
  }

  let packs: Array<{ id: string; code: string; title: string; priceXof: number; credits: number; badge?: string | null }> = []
  try {
    if (db?.creditPack?.findMany) {
      packs = (await db.creditPack.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { priceXof: "asc" }],
      })) as Array<{ id: string; code: string; title: string; priceXof: number; credits: number; badge?: string | null }>
    }
  } catch {
    packs = []
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#F8FAFC] pt-10 pb-16">
        <div className="container-max">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#0F172A]">Des offres adaptées à votre activité</h1>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">Commencez gratuitement. Payez uniquement lorsque vous avez besoin de plus.</p>
          </div>

          {success ? (
            <div className="mt-8">
              <PricingSuccessBanner />
            </div>
          ) : null}

          <div className="mt-10 flex items-center justify-center">
            <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
              <Link
                href="/pricing?tab=subscriptions"
                className={
                  "px-4 py-2 text-sm font-semibold rounded-xl transition-colors " +
                  (tab === "subscriptions" ? "bg-[#0F172A] text-white" : "text-[#0F172A] hover:bg-[#F8FAFC]")
                }
              >
                Abonnements
              </Link>
              <Link
                href="/pricing?tab=packs"
                className={
                  "px-4 py-2 text-sm font-semibold rounded-xl transition-colors " +
                  (tab === "packs" ? "bg-[#0F172A] text-white" : "text-[#0F172A] hover:bg-[#F8FAFC]")
                }
              >
                Packs de crédits
              </Link>
            </div>
          </div>

          {tab === "subscriptions" ? (
            <section className="mt-12">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A]">Abonnements</h2>
                <p className="mt-2 text-sm text-gray-600">Des crédits + des boosts + des avantages supplémentaires chaque mois.</p>
              </div>

              {plans.length ? (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                  {plans.map((p) => {
                    const benefits: string[] = Array.isArray(p.benefits) ? (p.benefits as any[]).map((x) => String(x)) : []
                    const highlight = isPopularBadge(p.badge)
                    const planNameUpper = String(p.name || "").toUpperCase()
                    const ctaLabel =
                      Number(p.monthlyPrice) === 0
                        ? "Commencer gratuitement"
                        : planNameUpper.includes("PRO")
                          ? "Passer à PRO"
                          : planNameUpper.includes("BUSINESS")
                            ? "Choisir Business"
                            : "Choisir ce plan"

                    return (
                      <div
                        key={p.id}
                        className={
                          "relative rounded-2xl border bg-white p-6 shadow-sm flex flex-col " +
                          (highlight ? "border-[#F97316] shadow-lg md:-translate-y-1" : "border-gray-200")
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-[#0F172A]">{p.name}</h3>
                          </div>
                          {p.badge ? (
                            <span className={
                              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
                              (highlight ? "bg-[#F97316] text-white" : "bg-[#F97316]/10 text-[#9A3412]")
                            }>
                              {p.badge}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-6 text-4xl font-extrabold tracking-tight text-[#0F172A]">
                          {Number(p.monthlyPrice).toLocaleString("fr-FR")} <span className="text-base font-semibold text-gray-600">{p.currency}/mois</span>
                        </p>

                        <div className="mt-5 rounded-xl border border-gray-200 bg-[#F8FAFC] p-4 text-sm text-gray-700">
                          <p className="font-semibold">{Number(p.monthlyCredits || 0)} crédits/mois</p>
                          <p className="mt-1">{Number(p.monthlyBoosts || 0)} boosts/mois</p>
                        </div>

                        {benefits.length ? (
                          <ul className="mt-5 space-y-2 text-sm text-gray-700">
                            {benefits.map((b, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="mt-[2px] text-[#16A34A] font-bold">✓</span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="mt-5 text-sm text-gray-500">Aucun avantage renseigné.</div>
                        )}

                        <div className="mt-6 flex-1" />

                        <div className="pt-6">
                          {p.code ? (
                            <Link
                              href={
                                Number(p.monthlyPrice) === 0
                                  ? "/abonnement"
                                  : `/pricing/subscription-checkout?plan=${encodeURIComponent(p.code)}`
                              }
                              className={
                                "w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors " +
                                (highlight ? "bg-[#F97316] text-white hover:bg-[#EA580C]" : "bg-[#0F172A] text-white hover:bg-[#0b1220]")
                              }
                            >
                              {ctaLabel}
                            </Link>
                          ) : (
                            <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                              Indisponible (code manquant)
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
                  Aucun abonnement publié pour le moment.
                </div>
              )}
            </section>
          ) : (
            <section className="mt-12">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A]">Besoin de crédits sans abonnement ?</h2>
                <p className="mt-2 text-sm text-gray-600">Achetez des crédits quand vous en avez besoin. Vos crédits achetés n’expirent pas.</p>
              </div>

              {packs.length ? (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {packs.map((p) => {
                    const unit = p.credits > 0 ? Math.round(p.priceXof / p.credits) : 0
                    const highlight = isPopularBadge(p.badge)

                    return (
                      <div
                        key={p.code}
                        className={
                          "rounded-2xl border bg-white p-6 shadow-sm hover:shadow-lg transition-all flex flex-col " +
                          (highlight ? "border-[#F97316]" : "border-gray-200")
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-semibold text-[#0F172A]">{p.title}</h3>
                          {p.badge ? (
                            <span className={
                              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
                              (highlight ? "bg-[#F97316] text-white" : "bg-[#F97316]/10 text-[#9A3412]")
                            }>
                              {p.badge}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-5">
                          <p className="text-4xl font-extrabold tracking-tight text-[#0F172A]">{p.credits} crédit{p.credits > 1 ? "s" : ""}</p>
                          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{formatXof(p.priceXof)}</p>
                          <p className="mt-2 text-sm text-gray-600">≈ {unit.toLocaleString("fr-FR")} FCFA/contact</p>
                        </div>

                        <div className="mt-6 flex-1" />

                        <div className="pt-6">
                          <Link
                            href={`/pricing/checkout?pack=${encodeURIComponent(p.code)}`}
                            className="w-full inline-flex items-center justify-center rounded-xl bg-[#F97316] text-white px-5 py-3 text-sm font-semibold hover:bg-[#EA580C] transition-colors"
                          >
                            Acheter {p.credits} crédit{p.credits > 1 ? "s" : ""}
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
                  Aucun pack actif pour le moment.
                </div>
              )}
            </section>
          )}

          <section className="mt-12">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#0F172A]">Quel choix pour moi ?</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-4">
                  <p className="font-semibold">Besoin occasionnel</p>
                  <p className="mt-2">→ Pack de crédits</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-4">
                  <p className="font-semibold">Plusieurs transports chaque mois</p>
                  <p className="mt-2">→ PRO</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-4">
                  <p className="font-semibold">Entreprise / courtier / activité intensive</p>
                  <p className="mt-2">→ BUSINESS</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  )
}
