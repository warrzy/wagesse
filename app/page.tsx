"use client"

import { motion, useReducedMotion, Variants } from "framer-motion"
import { MATERIAL_TYPES, TRUCK_TYPES } from "@/lib/config"
import { marketplaceImage } from "@/lib/marketplace-images"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Hero from "@/components/Hero"
import Reveal from "@/components/Reveal"
import RoutePulse from "@/components/RoutePulse"
import CatalogImage from "@/components/CatalogImage"
import Link from "next/link"
import { useState } from "react"
import { ArrowRight, ClipboardList, Lock, Route, Truck, Wallet } from "lucide-react"

const materials = [
  { id: "sand", image: "terrassement" },
  { id: "gravel", image: "tombereau-granite" },
  { id: "granite", image: "pelle-chargement" },
  { id: "earth", image: "benne-carriere" },
]

const trucks = [
  { id: "dump3", image: "benne-carriere" },
  { id: "dump4", image: "terrassement" },
  { id: "dump5", image: "piste-chantier" },
  { id: "articulated", image: "tombereau-granite" },
  { id: "flatbed", image: "piste-chantier" },
  { id: "container", image: "pelle-chargement" },
]

const faqs = [
  {
    q: "Comment publier une demande ?",
    a: "Créez un compte client avec votre numéro et un mot de passe. Indiquez le matériau, la quantité, la ville de départ, la ville d’arrivée et la date. Vous pouvez enregistrer un brouillon ou publier la demande.",
  },
  {
    q: "Comment arrivent les devis ?",
    a: "Un transporteur inscrit consulte les demandes publiées et envoie un devis : prix, véhicule et date proposée. Vous comparez les devis reçus avant d’en accepter un.",
  },
  {
    q: "Quand voit-on les coordonnées ?",
    a: "Les numéros restent masqués tant que le client n’a pas accepté un devis. L’acceptation ne coûte rien au client. Le transporteur dépense des crédits seulement pour envoyer un devis.",
  },
  {
    q: "Comment paie-t-on les crédits et les forfaits ?",
    a: "Le transporteur choisit un pack ou un forfait. La commande reste en attente. Le super administrateur confirme le règlement reçu hors plateforme, puis les crédits sont attribués une seule fois.",
  },
  {
    q: "Comment suit-on une mission ?",
    a: "Après l’acceptation du devis, la mission avance par étapes : route vers le chargement, chargement, route vers la livraison, livraison, puis confirmation du client.",
  },
  {
    q: "Faut-il un code SMS pour s’inscrire ?",
    a: "Non pour ce lancement. L’inscription et la connexion se font avec le numéro de téléphone et le mot de passe. La vérification par SMS reste dans le produit, elle n’est pas exigée.",
  },
]

export default function Home() {
  const reduceMotion = useReducedMotion()
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const item: Variants = {
    hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 },
    visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.45 } },
  }

  return (
    <>
      <Header />
      <Hero clientCtaHref="/auth/signup?role=CLIENT" truckerCtaHref="/auth/signup?role=TRUCKER" />
      <RoutePulse />

      <section id="fonctionnement" className="bg-[#F4F8FC] py-20">
        <div className="container-max">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#087DD1]">Deux parcours</p>
            <h2 className="mt-3 text-4xl text-[#071D40] md:text-5xl">Un trajet clair, de la demande à la livraison.</h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Reveal><article className="card-live rounded-3xl bg-white p-8 shadow-[0_16px_50px_rgba(7,29,64,0.06)]">
              <h3 className="text-2xl">Pour le client</h3>
              <ol className="mt-6 space-y-5">
                {[
                  ["Décrire le besoin", "Matériau, quantité, départ, destination et date."],
                  ["Recevoir des devis", "Chaque devis indique un prix en FCFA et une date."],
                  ["Choisir gratuitement", "Le prix, le véhicule et le transporteur sont visibles. Le numéro arrive après acceptation."],
                  ["Confirmer la mission", "Vous validez la fin du transport après la livraison."],
                ].map(([title, text], index) => (
                  <li key={title} className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#071D40] text-sm font-semibold text-[#FF7900]">{index + 1}</span>
                    <span>
                      <span className="block font-semibold text-[#071D40]">{title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-[#071D40]/70">{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Link href="/auth/signup?role=CLIENT" className="button-primary mt-8 inline-flex">
                Publier une demande
              </Link>
            </article></Reveal>
            <Reveal><article className="card-live overflow-hidden rounded-3xl bg-[#071D40] text-white">
              <div className="relative h-52">
                <CatalogImage src={marketplaceImage("pelle-chargement").src} alt={marketplaceImage("pelle-chargement").alt} sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>
              <div className="p-8">
                <h3 className="text-2xl text-white">Pour le transporteur</h3>
                <ol className="mt-6 space-y-5">
                  {[
                    ["Créer le compte", "Téléphone et mot de passe, depuis le téléphone."],
                    ["Déclarer les véhicules", "Plaque, type et capacité en tonnes."],
                    ["Répondre avec des crédits", "Consulter est gratuit. Envoyer un devis débite le portefeuille."],
                    ["Avancer la mission", "Chaque étape se met à jour jusqu’à la confirmation du client."],
                  ].map(([title, text], index) => (
                    <li key={title} className="flex gap-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#FF7900] text-sm font-semibold text-[#071D40]">{index + 1}</span>
                      <span>
                        <span className="block font-semibold">{title}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-white/70">{text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <Link href="/auth/signup?role=TRUCKER" className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-white px-6 font-semibold text-[#071D40]">
                  Je transporte
                </Link>
              </div>
            </article></Reveal>
          </div>
        </div>
      </section>

      <section id="materiaux" className="bg-white py-20">
        <div className="container-max">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#087DD1]">Matériaux</p>
              <h2 className="mt-3 text-4xl md:text-5xl">Ce qui se transporte vraiment.</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[#071D40]/70">
              Sable, gravier, granite, terre, béton, briques, métaux et déchets de chantier. La disponibilité dépend des camionneurs qui répondent.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {materials.map((itemMaterial) => {
              const material = MATERIAL_TYPES.find((entry) => entry.id === itemMaterial.id)
              const photo = marketplaceImage(itemMaterial.image)
              if (!material) return null
              return (
                <article key={material.id} className="card-live group overflow-hidden rounded-3xl bg-[#F4F8FC]">
                  <div className="relative aspect-[4/5]">
                    <CatalogImage src={photo.src} alt={photo.alt} sizes="(max-width: 1024px) 50vw, 25vw" className="transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071D40] via-[#071D40]/10 to-transparent" />
                    <h3 className="absolute bottom-5 left-5 right-5 text-2xl text-white">{material.name}</h3>
                  </div>
                </article>
              )
            })}
          </div>
          <ul className="mt-6 flex flex-wrap gap-2 text-sm text-[#071D40]/75">
            {MATERIAL_TYPES.map((material) => (
              <li key={material.id} className="rounded-full border border-[#071D40]/10 bg-[#F4F8FC] px-3 py-2">{material.name}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="camions" className="bg-[#F4F8FC] py-20">
        <div className="container-max">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#087DD1]">Camions</p>
            <h2 className="mt-3 text-4xl md:text-5xl">La capacité se choisit en tonnes.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {TRUCK_TYPES.map((truck) => {
              const photo = marketplaceImage(trucks.find((item) => item.id === truck.id)?.image || "benne-carriere")
              return (
                <article key={truck.id} className="card-live overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_rgba(7,29,64,0.05)]">
                  <div className="relative h-52">
                    <CatalogImage src={photo.src} alt={photo.alt} sizes="(max-width: 768px) 100vw, 33vw" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl">{truck.name}</h3>
                    <p className="mt-2 text-sm text-[#071D40]/70">{truck.minCapacity} à {truck.maxCapacity} tonnes</p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container-max">
          <h2 className="max-w-xl text-4xl md:text-5xl">Ce que la plateforme fait, et rien de plus.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              [ClipboardList, "Demande structurée", "Matériau, quantité, villes et date. Le brouillon reste privé tant qu’il n’est pas publié."],
              [Truck, "Devis comparables", "Prix en FCFA, véhicule et date proposée. Vous acceptez un devis, pas une promesse automatique."],
              [Lock, "Contacts protégés", "Le numéro reste masqué jusqu’à l’acceptation du devis. Aucun crédit supplémentaire n’est demandé."],
              [Wallet, "Paiement manuel", "Crédits et forfaits sont commandés, puis validés par l’administration. Rien n’est attribué avant."],
              [Route, "Mission par étapes", "Le transporteur déclare le chargement, la route et la livraison. Le client confirme la fin."],
              [ArrowRight, "Comptes distincts", "Client et transporteur n’ont pas le même espace. L’administration a le sien."],
            ].map(([Icon, title, text]) => (
              <article key={String(title)} className="card-live rounded-3xl border border-[#071D40]/10 p-6 hover:border-[#087DD1]/40">
                <Icon size={22} className="text-[#FF7900]" aria-hidden="true" />
                <h3 className="mt-4 text-lg">{String(title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#071D40]/70">{String(text)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs" className="bg-[#071D40] py-20 text-white">
        <div className="container-max grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF7900]">Tarifs</p>
            <h2 className="mt-3 text-4xl text-white md:text-5xl">Les prix affichés sont ceux publiés.</h2>
            <p className="mt-5 max-w-xl text-white/75">
              Le client publie et gère ses demandes gratuitement. Le transporteur utilise des crédits pour répondre à une demande. Packs et forfaits sont attribués après validation manuelle du règlement.
            </p>
            <Link href="/pricing" className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-[#FF7900] px-6 font-semibold text-[#071D40]">
              Voir les forfaits et les crédits
            </Link>
          </div>
          <div className="relative min-h-72 overflow-hidden rounded-3xl">
            <CatalogImage src={marketplaceImage("terrassement").src} alt={marketplaceImage("terrassement").alt} sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#F4F8FC] py-20">
        <div className="container-max grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-4xl md:text-5xl">Questions fréquentes</h2>
          <div className="divide-y divide-[#071D40]/10 rounded-3xl bg-white px-6">
            {faqs.map((faq, index) => {
              const open = openFaq === index
              return (
                <div key={faq.q} className="py-2">
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center justify-between gap-4 text-left font-semibold text-[#071D40]"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                  >
                    {faq.q}
                    <span aria-hidden="true" className="text-[#FF7900]">{open ? "–" : "+"}</span>
                  </button>
                  {open ? <p className="pb-4 text-sm leading-relaxed text-[#071D40]/75">{faq.a}</p> : null}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#071D40] py-24 text-white">
        <div className="absolute inset-0 opacity-30">
          <CatalogImage src={marketplaceImage("piste-chantier").src} alt="" sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-[#071D40]/75" />
        <motion.div variants={item} initial="hidden" whileInView="visible" viewport={{ once: true }} className="container-max relative">
          <h2 className="max-w-2xl text-4xl text-white md:text-6xl">Le prochain voyage commence par une demande.</h2>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/signup?role=CLIENT" className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#FF7900] px-7 font-semibold text-[#071D40]">
              Trouver un camion
            </Link>
            <Link href="/auth/signup?role=TRUCKER" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/30 px-7 font-semibold text-white">
              Je suis transporteur
            </Link>
          </div>
        </motion.div>
      </section>
      <Footer />
    </>
  )
}
