Projet développé par GitHub Copilot | Stack: Next.js, TypeScript, Prisma, PostgreSQL, Tailwind CSS

# 🚛 WAGESSE - Marketplace de Fret au Burkina Faso

## 📋 Vue d'ensemble

**WAGESSE** est une plateforme web premium de mise en relation entre clients (entreprises de BTP, mines, commerçants) et camionneurs pour les transports de matériaux en Afrique de l'Ouest, avec un focus initial sur le Burkina Faso.

## 🎯 Objectif de la phase actuelle (Lancement) : Tarifs dynamiques + paiement

Mettre en place un **modèle commercial clair** et **administrable** depuis l'interface admin :

- **1 crédit = 1 déblocage de contact**.
- **Packs de crédits** : achats ponctuels, crédits achetés **n'expirent pas**.
- **Abonnements** : crédits mensuels + boosts + avantages.
  - Les crédits mensuels **expirent en fin de cycle**.

Exigences :

- Les **plans d'abonnement** et **packs de crédits** doivent être **100% pilotés par la DB** (pas de hardcode sur la page publique).
- L'admin doit pouvoir :
  - créer
  - modifier
  - publier / dépublier (abonnements)
  - archiver (abonnements)
  - activer / désactiver
  - changer prix, crédits, boosts, avantages, badge, ordre d'affichage
- Réutiliser **le système de paiement existant** (ne pas reconstruire).

## ✅ Réalisé jusqu'à maintenant

### 1) Abonnements (dynamiques, DB-driven)

- API publique : `GET /api/subscription/plans`
  - Retourne uniquement : `isActive=true`, `isPublished=true`, `isVisible=true`, `archivedAt=null`
  - Cache désactivé (réactivité immédiate après modifications admin)
- Admin abonnements (CRUD + publication)
  - Liste : `/admin/abonnements`
  - Détail / édition : `/admin/abonnements/[id]`
  - Gestion `isPublished`, `isVisible`, `sortOrder`, `badge`, `monthlyCredits`, `monthlyBoosts`, `benefits`
  - Gestion erreur Prisma `P2002` (code unique) → **409** avec message clair
- Activation d'abonnement : support des codes dynamiques (validation par lookup DB)

### 2) Paiement abonnement (réutilise le système existant)

- API : `POST /api/subscription/purchase`
  - Initialise un paiement `SUBSCRIPTION` via `paymentServiceLayer.initialize`
  - Au succès, side effects : activation/renouvellement de l'abonnement
- Checkout : `/pricing/subscription-checkout?plan=CODE`

### 3) Packs de crédits (dynamiques, DB-driven)

- Admin packs (CRUD)
  - Liste + création : `/admin/tarifs`
  - Détail / édition / suppression : `/admin/tarifs/[id]`
  - API :
    - `GET /api/admin/credit-packs`
    - `POST /api/admin/credit-packs`
    - `GET /api/admin/credit-packs/[id]`
    - `PATCH /api/admin/credit-packs/[id]`
    - `DELETE /api/admin/credit-packs/[id]` (avec garde-fou)
  - Suppression : **409** si le pack a déjà été utilisé dans un paiement (dans ce cas → désactiver)

### 4) Page publique Pricing (nouvelle UI)

- Page : `/pricing`
  - Titre + sous-titre (lancement)
  - Onglets : `[ Abonnements ] [ Packs de crédits ]`
  - Abonnements : 3 cards alignées, ✓ avantages, CTA en bas, PRO mis en avant via badge
  - Packs : affichage clair (crédits, prix, ≈ FCFA/contact)
  - Bloc d'aide : "Quel choix pour moi ?"
- Page forcée en dynamique (`force-dynamic` / `revalidate=0`) pour que `?tab=packs` fonctionne correctement.

### 5) Seed (valeurs de lancement en DB)

- Mise à jour du seed Prisma : `prisma/seed.ts`
  - Abonnements : FREE / PRO / BUSINESS
  - Packs : Découverte / Essentiel / Pro / Business

## 🧩 À faire (autres blocs / lots)

### Lot A — Vérification fonctionnelle end-to-end (tarifs)

- Vérifier que :
  - le **prix DB** est bien celui utilisé au paiement (packs + abonnements)
  - les plans/packs **dépubliés/désactivés** n'apparaissent plus sur la page publique
  - l'admin peut réordonner l'affichage (via `sortOrder`) et l'ordre se reflète sur `/pricing`

### Lot B — Règles produit "crédits" et expiration

- Valider côté backend :
  - crédits achetés (packs) = persistants
  - crédits mensuels (abonnement) = expirent en fin de cycle
  - règles de cumul / renouvellement / idempotence paiement

### Lot C — UX & contenu marketing final

- Ajouter/valider dans l'admin :
  - wording exact des avantages
  - badges exacts (ex : "Le plus populaire", "Pour les professionnels", "Meilleure valeur")
  - cohérence marketing (PRO doit rester l'offre la plus attractive)

### Lot D — Nettoyage + stabilité

- Tests manuels + corrections mineures UI (alignements, responsive, accessibilité)
- Vérifier la compatibilité build/prod (cache Next.js, revalidation)
- Vérifier les migrations Prisma et la génération du client sur Windows

---

### Caractéristiques principales

- 🔐 **Authentification sécurisée** par OTP et JWT
- 🚚 **Matching intelligent** entre clients et camionneurs
- 💳 **Paiements sécurisés** (Orange Money, Mobile Money, Cartes)
- 📊 **Tableaux de bord** pour clients, camionneurs et admins
- 🗺️ **Localisation flexible** adaptée aux réalités africaines
- ⭐ **Système de notation** transparent
- 📱 **Mobile-first** pour connexions lentes
- 🛡️ **Vérification rigoureuse** des utilisateurs et documents

---

## 🏗️ Architecture

### Stack Technique

```
Frontend:  Next.js (App Router) + React + TypeScript + Tailwind CSS + Framer Motion
Backend:   Next.js API Routes + TypeScript
Database:  PostgreSQL + Prisma ORM
Auth:      JWT + OTP
Storage:   AWS S3 (compatible)
Payments:  Abstraction multi-provider + Sandbox
```

### Structure du Projet

```
wagesse/
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                 # Landing page
│   ├── auth/                    # Authentication pages
│   ├── dashboard/               # User dashboards
│   ├── admin/                   # Admin panel
│   └── api/                     # API routes
├── components/                   # React components
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── ...
├── lib/                         # Utilities & services
│   ├── auth.ts
│   ├── api-client.ts
│   ├── config.ts               # Configuration centralisée
│   ├── types.ts                # TypeScript types
│   ├── validations.ts          # Zod schemas
│   └── utils.ts
├── styles/                      # CSS
│   └── globals.css
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Demo data
├── public/                     # Static assets
├── .env.example                # Environment variables template
├── next.config.js
├── tailwind.config.js
├── typescript.config.json
└── README.md

---

## 🚀 Installation & Setup

### Prérequis

- Node.js 22 LTS (voir `.nvmrc`)
- MySQL 8+
- npm ou yarn

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration de l'environnement

```bash
cp .env.example .env
```

Éditer `.env`:
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/wagesse"

# JWT
JWT_SECRET=your_super_secret_key_change_in_production

# App
NEXT_PUBLIC_APP_NAME=Wagesse
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Payment (Sandbox)
PAYMENT_PROVIDER=orange_money_sandbox

# SMTP (pour emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### 3. Base de données

```bash
# Exécuter les migrations
npm run prisma:migrate

# Générer le client Prisma
npm run prisma:generate

# Charger les données de démonstration (optionnel)
npm run seed
```

### 4. Démarrer le développement

```bash
npm run dev
```

L'application est accessible sur `http://localhost:3000`

---

## 📱 Les Utilisateurs & Rôles

### 1. **Visiteur**
- Consulte la landing page
- Cherche des camionneurs (sans voir leurs coordonnées)
- Crée un compte gratuit

### 2. **Client**
- Publication de demandes de transport
- Paiement des frais de mise en relation
- Réception de profils de camionneurs vérifiés
- Déblocage des coordonnées après paiement
- Gestion des missions et paiements
- Notation des camionneurs

### 3. **Camionneur**
- Inscription gratuite ou payante (abonnements)
- Configuration des camions et documents
- Réception de demandes compatibles
- Envoi de propositions tarifaires
- Suivi des missions
- Accès aux revenus et commissions

### 4. **Agent Opérationnel**
- Assistance utilisateurs
- Création de demandes manuelles
- Vérification de documents
- Gestion des incidents

### 5. **Administrateur**
- Gestion complète de la plateforme
- Vérification des utilisateurs et documents
- Gestion des abonnements
- Suivi des paiements et commissions
- Tableau de bord avec statistiques
- Audit logs

---

## 🔄 Parcours Principal du Client

### 1. Décrire le Besoin

Client renseigne:
- Matériau (sable, granite, terre, etc.)
- Quantité et unité
- Lieux de chargement/livraison
- Date souhaitée
- Budget estimé
- Photos du chantier

### 2. Estimation du Coût

- Récapitulatif du besoin
- Estimation indicative
- Nombre de camionneurs disponibles
- Avertissement sur la variabilité du prix final

### 3. Paiement de la Mise en Relation

Options de paiement:
- 💵 Orange Money
- 💳 Mobile Money (agrégateur)
- 🏦 Carte bancaire

### 4. Mise en Relation

- Sélection automatique de 3-4 camionneurs compatibles
- Affichage: profil, véhicule, notes, zone desservie
- Déverrouillage du numéro de téléphone
- Possibilité d'appel direct / WhatsApp

### 5. Propositions

Camionneurs envoient:
- Prix total ou prix par voyage
- Date de disponibilité
- Délai estimé
- Conditions particulières

### 6. Contrat & Paiement

- Contrat récapitulatif
- Choix du modèle de paiement (intégral, acompte, par rotation)
- Acceptation des deux parties

### 7. Exécution

Statuts suivis en temps réel:
- Camion en route vers chargement
- Chargement en cours
- En route vers livraison
- Livraison complétée

### 8. Livraison & Versement

- Preuve de livraison (photo + GPS)
- Code OTP optionnel
- Confirmation du client
- Calcul de la commission
- Versement au camionneur (moins commission)
- Notation réciproque

---

##💰 Modèle Économique

### Frais de Mise en Relation

**Variable selon la distance:**
- Jusqu'à 50 km: 1 500 XOF
- 50-100 km: 2 500 XOF
- 100-200 km: 3 500 XOF
- > 200 km: 5 000 XOF

### Commission sur les Missions

**Variable selon l'abonnement du camionneur:**
- Découverte: 12%
- Professionnel: 10%
- Flotte: 8%

### Abonnements Camionneurs

| Plan | Prix/mois | Max Véhicules | Commission | Caractéristiques |
|------|-----------|---------------|-----------|------------------|
| Découverte | 5 000 XOF | 1 | 12% | Basic |
| Professionnel | 15 000 XOF | 5 | 10% | Prioritaire + Stats |
| Flotte | 50 000 XOF | ∞ | 8% | Complet + Support dédié |

---

## 🔐 Sécurité

### Authentication
- ✅ Vérification du numéro téléphone par OTP
- ✅ JWT pour les sessions
- ✅ Hashage bcrypt des mots de passe
- ✅ Double authentification pour admins

### Paiements
- ✅ Webhook verification de la part du prestataire
- ✅ Idempotence (pas de double charge)
- ✅ Ledger pour réconciliation
- ✅ Chiffrement des données sensibles

### Données
- ✅ Les documents personnels ne sont jamais publiquement accessibles
- ✅ URLs temporaires avec expirationpour téléchargements
- ✅ Journalisation d'audit de tous les changements sensibles
- ✅ HTTPS obligatoire en production

---

## 🎨 Design System

### Palette de Couleurs

```
Primary (Terracotta):  #E8714D
Secondary (Earth):     #8B6F47  
Accent (Sand):         #D4B896
Dark (Anthracite):     #2C3E50
Light (Cream):         #F5F1ED
Success (Green):       #4CAF50
Warning (Orange):      #FFA500
Danger (Red):          #EF4444
```

### Principes UX

- 📱 Mobile-first
- ✅ Boutons tactiles larges
- ✅ Textes lisibles en extérieur
- ✅ Formulaires simples et clairs
- ✅ États de chargement visibles
- ✅ Confirmations avant suppression
- ✅ Messages d'erreur explicites
- ✅ Accessibilité WCAG AA

---

## 📊 Données de Démonstration

### Villes principales du Burkina Faso
- Ouagadougou (Kadiogo)
- Bobo-Dioulasso (Houet)
- Koudougou (Boulkiemdé)
- Ouahigouya (Yatenga)
- Banfora (Comoe)
- Kaya (Sanmatenga)
- Manga (Zoundweogo)
- Ziniaré (Kadiogo)

### Matériaux

- 🏔️ Sable
- ⛰️ Gravier
- 🪨 Granite
- 🌍 Terre/Remblai
- 🏗️ Béton
- 🧱 Briques
- ♻️ Ferraille
- 🧹 Déchets de chantier

### Types de Camions

- Benne 3 essieux (15-20 tonnes)
- Benne 4 essieux (20-25 tonnes)
- Benne 5 essieux (25-32 tonnes)
- Semi-remorque (25-35 tonnes)
- Plateau (10-25 tonnes)
- Porte-conteneurs (20-30 tonnes)

---

## 🔌 Intégrations Paiements

### Providers Supportés

#### 1. Orange Money Sandbox
- Configuration pour développement
- Webhooks simulés
- Aucun identifiant réel

#### 2. Agrégateur Mobile Money
- Support multiple pays
- Frais variables

#### 3. Stripe (Cartes Bancaires)
- Test mode disponible

### Architecture des Paiements

```
PaymentProvider (Interface)
├── OrangeMoneyProvider (Sandbox)
├── AggregatorProvider
└── StripeProvider
```

Utilisation:
```typescript
const provider = PaymentProviderFactory.create(
  process.env.PAYMENT_PROVIDER
);

const result = await provider.charge({
  amount: 5000,
  reference: "REQ-XYZ",
  customerPhone: "226XXXXXXXX",
});
```

---

## 🚀 Déploiement

### Checklist Pré-Production

- [ ] Variables d'environnement stockées dans un service sécurisé
- [ ] HTTPS activé
- [ ] JWT_SECRET changé
- [ ] Database backups configurés
- [ ] Logs centralisés (Sentry/CloudWatch)
- [ ] SSL certificates valides
- [ ] Rate limiting activé
- [ ] CORS restrictions correctes

### Déploiement sur Vercel

```bash
vercel deploy --prod
```

### Déploiement Docker

```bash
docker build -t wagesse .
docker run -p 3000:3000 wagesse
```

---

## 🧪 Tests

La validation technique disponible :

```bash
# TypeScript et lint
npm run typecheck
npm run lint

# E2E Playwright (démarre automatiquement l'application)
npm run test:e2e

# Build, puis boucle complète
npm run build
npm run validate
```

---

## 📚 Documentation Supplémentaire

- [Modèle de Données](./docs/schema.md)
- [API Reference](./docs/api.md)
- [Guide de Configuration](./docs/configuration.md)
- [Guide des Paiements](./docs/payments.md)

---

## 🐛 Troubleshooting

### Erreur: "DATABASE_URL not set"
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/wagesse"
```

### Erreur Prisma: "Cannot find @prisma/client"
```bash
npm install @prisma/client
npm run prisma:generate
```

### Port 3000 en utilisation
```bash
npm run dev -- -p 3001
```

---

## 📞 Support

- 📧 Email: contact@wagesse.bf
-شارة WhatsApp: https://wa.me/226xxxxxxxxxxx
- 🌐 Site: https://wagesse.bf

---

## 📄 License

Propriétaire. Tous droits réservés © 2024 Wagesse

---

**Développé avec ❤️ au Burkina Faso pour l'Afrique de l'Ouest**
