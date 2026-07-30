# 📂 STRUCTURE DU PROJET WAGESSE

## Arborescence Complète

```
wagesse/
│
├── app/                                  # Next.js App Router (13+ structure)
│   ├── layout.tsx                        # Layout global
│   ├── page.tsx                          # Landing page premium
│   │
│   ├── auth/                             # Authentification
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── verify-otp/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── dashboard/                        # Espaces utilisateurs
│   │   ├── client/
│   │   │   ├── page.tsx                 # Dashboard client
│   │   │   ├── requests/                # Gestion des demandes
│   │   │   ├── missions/                # Suivi des missions
│   │   │   └── payments/                # Historique paiements
│   │   │
│   │   ├── trucker/
│   │   │   ├── page.tsx                 # Dashboard camionneur
│   │   │   ├── profile/                 # Configuration profil
│   │   │   ├── vehicles/                # Gestion véhicules
│   │   │   └── earnings/                # Revenus & commissions
│   │   │
│   │   └── operator/                    # Agent opérationnel
│   │       ├── page.tsx
│   │       ├── users/                   # Gestion utilisateurs
│   │       ├── documents/               # Vérification docs
│   │       └── incidents/               # Gestion incidents
│   │
│   ├── admin/                            # Back-office administrateur
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── payments/
│   │   ├── commissions/
│   │   ├── disputes/
│   │   ├── settings/
│   │   └── analytics/
│   │
│   ├── api/                              # API Routes
│   │   ├── auth/
│   │   │   ├── signup/route.ts
│   │   │   ├── login/route.ts
│   │   │   ├── verify-otp/route.ts
│   │   │   └── logout/route.ts
│   │   ├── requests/
│   │   │   ├── route.ts                 # GET/POST requests
│   │   │   ├── [id]/route.ts            # GET/PUT/DELETE specific
│   │   │   └── [id]/publish/route.ts
│   │   ├── missions/
│   │   │   ├── route.ts
│   │   │   └── [id]/status/route.ts
│   │   ├── payments/
│   │   │   ├── route.ts
│   │   │   ├── [id]/verify/route.ts
│   │   │   └── webhook/route.ts
│   │   ├── quotes/
│   │   │   ├── route.ts
│   │   │   └── [id]/accept/route.ts
│   │   ├── profiles/
│   │   │   ├── customer/route.ts
│   │   │   └── trucker/route.ts
│   │   └── vehicles/route.ts
│   │
│   ├── public-pages/                    # Pages publiques
│   │   ├── about/page.tsx
│   │   ├── how-it-works/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── materials/page.tsx
│   │   ├── zones/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── security/page.tsx
│   │
│   └── error.tsx                         # Error boundary
│
├── components/                           # React Components (réutilisables)
│   ├── Header.tsx                        # Navigation principale
│   ├── Footer.tsx                        # Footer
│   ├── Navigation.tsx
│   │
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Alert.tsx
│   │   ├── Loading.tsx
│   │   └── EmptyState.tsx
│   │
│   ├── forms/
│   │   ├── TransportRequestForm.tsx
│   │   ├── QuoteForm.tsx
│   │   ├── VehicleForm.tsx
│   │   ├── ProfileForm.tsx
│   │   └── PaymentForm.tsx
│   │
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   ├── MissionCard.tsx
│   │   ├── RequestList.tsx
│   │   └── ActivityFeed.tsx
│   │
│   └── matching/
│       ├── MatchCard.tsx
│       ├── MatchingResults.tsx
│       └── ContactUnlock.tsx
│
├── lib/                                  # Utilitaires & Services
│   ├── config.ts                         # Configuration centralisée
│   ├── types.ts                          # TypeScript interfaces
│   ├── validations.ts                    # Zod schemas
│   ├── auth.ts                           # Auth utilities
│   ├── api-client.ts                     # API client wrapper
│   ├── payment-provider.ts               # Payment abstraction
│   ├── utils.ts                          # General utilities
│   │
│   ├── services/
│   │   ├── auth-service.ts
│   │   ├── request-service.ts
│   │   ├── matching-service.ts
│   │   ├── payment-service.ts
│   │   ├── mission-service.ts
│   │   ├── notification-service.ts
│   │   └── user-service.ts
│   │
│   └── hooks/                            # React Custom Hooks
│       ├── useAuth.ts
│       ├── useFetch.ts
│       ├── useForm.ts
│       └── useNotification.ts
│
├── prisma/
│   ├── schema.prisma                     # Database schema
│   ├── migrations/                       # Database migrations
│   └── seed.ts                           # Demo data seed script
│
├── styles/
│   └── globals.css                       # Global styles + Tailwind
│
├── public/
│   ├── favicon.ico
│   ├── logo.png
│   ├── images/
│   │   ├── heroes/
│   │   ├── materials/
│   │   ├── trucks/
│   │   └── testimonials/
│   └── data/
│       └── demo-data.json
│
├── docs/                                 # Documentation
│   ├── schema.md                         # Database schema explanation
│   ├── api.md                            # API reference
│   ├── configuration.md                  # Setup guide
│   ├── payments.md                       # Payment system documentation
│   ├── deployment.md                     # Deployment guide
│   └── architecture.md                   # Architecture overview
│
├── tests/                                # Tests
│   ├── unit/                             # Unit tests
│   ├── integration/                      # Integration tests
│   ├── e2e/                              # End-to-end tests
│   └── fixtures/                         # Test data
│
├── .env.example                          # Environment variables template
├── .gitignore
├── .prettierrc                           # Code formatter
├── .eslintrc.json                        # Linter config
├── docker-compose.yml                    # Docker setup
├── Dockerfile                            # Docker image
├── next.config.js                        # Next.js config
├── tailwind.config.js                    # Tailwind config
├── postcss.config.js                     # PostCSS config
├── tsconfig.json                         # TypeScript config
├── package.json
├── package-lock.json
└── README.md
```

---

## 🗂️ Détails par Dossier

### `app/`
Structure Next.js 13+ App Router.
- **page.tsx** = Landing page premium
- **layout.tsx** = Wrapper global avec Header/Footer
- **api/** = Routes API backend
- Chaque dossier avec `page.tsx` = nouvelle route

### `components/`
Composants React réutilisables.
- `common/`: Boutons, cartes, modales génériques
- `forms/`: Formulaires métier
- `dashboard/`: Composants dashboard
- `matching/`: Composants du système de matching

### `lib/`
Logique métier & services.
- `config.ts`: Config centralisée (marque, prix, etc.)
- `types.ts`: TypeScript interfaces
- `validations.ts`: Zod schemas pour validation
- `services/`: Logique métier indépendante de React
- `hooks/`: Custom hooks React

### `prisma/`
ORM & base de données.
- `schema.prisma`: Modèle de données complet
- `migrations/`: Historique des modifications de sché ma
- `seed.ts`: Données de démonstration

### `styles/`
- `globals.css`: Styles globaux + Tailwind utilities
- Design system défini (couleurs, spacing, etc.)

### `public/`
Assets statiques.
- Logos, images, favicons
- Données JSON si nécessaire

---

## 🔄 Flux de Données

```
User Action (UI)
        ↓
React Component
        ↓
API Client (lib/api-client.ts)
        ↓
Next.js API Route (app/api/*)
        ↓
Service Layer (lib/services/*)
        ↓
Prisma ORM
        ↓
PostgreSQL Database
        ↓
Response Back to UI
```

---

## 📝 Conventions de Naming

### Fichiers
- **Components**: `PascalCase.tsx` (ex: `Header.tsx`)
- **Utilities**: `kebab-case.ts` (ex: `auth-service.ts`)
- **Types**: `kebab-case.ts` (ex: `api-types.ts`)

### Variables
- **React Components**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` avec préfixe `I` optionnel

### Routes API
- **GET**: Récupérer des données
- **POST**: Créer de nouvelles données
- **PUT**: Remplacer complètement
- **PATCH**: Modifications partielles
- **DELETE**: Supprimer

---

## 🧩 Modules Clés

### 1. Authentication Module
```
lib/auth.ts
lib/services/auth-service.ts
lib/hooks/useAuth.ts
app/auth/login/page.tsx
app/auth/signup/page.tsx
app/api/auth/*
```

### 2. Request Management
```
lib/services/request-service.ts
app/dashboard/client/requests/
app/api/requests/*
components/forms/TransportRequestForm.tsx
```

### 3. Payment System
```
lib/payment-provider.ts
lib/services/payment-service.ts
app/api/payments/*
components/forms/PaymentForm.tsx
```

### 4. Matching Engine
```
lib/services/matching-service.ts
app/api/matches/
components/matching/*
```

### 5. Notifications
```
lib/services/notification-service.ts
app/api/notifications/*
lib/hooks/useNotification.ts
```

---

## 🔐 Sécurité par Couche

### Frontend
- Validation client (Zod)
- JWT stocké en `localStorage`
- HTTPS en production

### Backend
- Validation serveur (double)
- JWT verification
- Rate limiting
- Input sanitization

### Database
- Prepared statements (Prisma)
- Indexes sur champs clés
- Soft deletes (deletedAt)
- Audit logs

---

## 📦 Dépendances Principales

```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "tailwindcss": "^3.3.0",
  "prisma": "^5.4.0",
  "@prisma/client": "^5.4.0",
  "zod": "^3.22.0",
  "react-hook-form": "^7.47.0",
  "framer-motion": "^12.42.2",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.1.0"
}
```

---

## 🚀 Points de Démarrage

Pour ajouter une nouvelle feature:

1. **Créer le type** → `lib/types.ts`
2. **Validation** → `lib/validations.ts`
3. **Schéma DB** → `prisma/schema.prisma`
4. **Service** → `lib/services/`
5. **API Route** → `app/api/`
6. **Component** → `components/`
7. **Page** → `app/*/page.tsx`

---

## 📚 Références

- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Tailwind: https://tailwindcss.com/docs
- Zod: https://zod.dev
- Framer Motion: https://www.framer.com/motion
