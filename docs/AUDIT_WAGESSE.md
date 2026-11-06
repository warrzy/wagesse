# Audit WAGESSE

Date de l’audit : 6 novembre 2026 (Europe/Paris).
Branche auditée : `main` au commit `bf64432` (merge de `chore/agentic-dev-loop`).
Périmètre : revue statique du dépôt. Aucune modification fonctionnelle n’a été faite dans cette phase.
Exécution : `node_modules` est absent, MySQL n’est pas démarré dans cet environnement. Les statuts ci-dessous décrivent le code présent. Ils ne constituent pas une preuve d’exécution.

## Méthode

1. Lecture du README, de `ARCHITECTURE.md`, de `IMPLEMENTATION_PLAN.md`, de `COMPLETION_SUMMARY.md`, de `PROJECT_STRUCTURE.md`, de `DATABASE_INTEGRATION_GUIDE.md`, de `FILE_INVENTORY.md` et de `QUICK_START.md`.
2. Inventaire Git : `main` et `origin/chore/agentic-dev-loop` (déjà fusionnée). Arbre de travail propre.
3. Lecture du schéma Prisma, des cinq migrations et du seed.
4. Lecture des services (`lib/services/*`, `lib/payment-provider.ts`, `lib/auth.ts`, `lib/api-auth.ts`) et des routes API associées.
5. Repérage des écrans admin vides et des parcours UI branchés sur l’API client.

Les documents historiques du dépôt sont en retard sur le code. L’audit s’appuie sur le code, pas sur ces documents.

## Synthèse

WAGESSE est une application Next.js 16 (App Router), React 19, TypeScript, Prisma 6 et MySQL 8. Le cœur marketplace est en place : inscription, connexion, demandes de transport, devis, mission créée à l’acceptation d’un devis, véhicules, crédits, packs et abonnements pilotés par la base, back-office de consultation et d’édition.

Le produit n’est pas lançable commercialement en l’état.

- Le paiement par défaut est un bac à sable Orange Money. Confirmer l’écran de simulation marque le paiement `SUCCESSFUL` et attribue de vrais crédits ou un vrai forfait.
- `POST /api/subscription/activate` active un forfait sans paiement.
- Les coordonnées que le crédit est censé protéger fuient par deux endpoints.
- Le débit de crédit et l’enregistrement du déblocage ne sont pas atomiques.
- L’attribution après paiement n’est pas protégée contre un double traitement concurrent, surtout pour les abonnements.
- Il n’existe aucun circuit de commande manuelle (demande en attente, validation admin, attribution ensuite).
- PayDunya n’existe pas. L’abstraction de paiement actuelle ne connaît qu’Orange Money et un squelette Stripe.
- Neuf écrans du back-office sont des coquilles. Les notifications, le matching, les documents, les e-mails et le journal d’audit sont modélisés et non branchés.

Aucune régression n’a été introduite : ce document ne change pas le comportement de l’application.

## Écarts documentaires

| Source | Affirmation | Réalité dans le code |
| --- | --- | --- |
| README, ARCHITECTURE, COMPLETION_SUMMARY | PostgreSQL | `prisma/schema.prisma` et `migration_lock.toml` : `mysql`. `docker-compose.yml` : MySQL 8. |
| IMPLEMENTATION_PLAN | Services demandes, devis, missions et paiements « à faire » | Ces services existent et sont appelés par les routes `app/api`. |
| README | OTP, matching intelligent, notation, vérification documentaire, S3 | OTP généré puis journalisé, non bloquant. Pas de service de matching, de notation, d’upload ni d’e-mail. |
| README « 1 crédit = 1 déblocage » | Coût fixe | Le coût vient de `SubscriptionPlan.unlockCostCredits`, sinon 1. |
| Page publique des packs | 100 % base de données | `GET /api/credits/packs` retombe sur quatre packs codés en dur si la table est vide ou si Prisma échoue. |
| UI admin | Rôle `SUPER_ADMIN` | L’enum Prisma `Role` s’arrête à `ADMIN`. Écrire `SUPER_ADMIN` fera échouer la base. |

## État du dépôt

- Stack réelle : Next.js `^16.2.10`, React 19, Tailwind 4, Prisma 6, MySQL, JWT maison (`jsonwebtoken` + `bcryptjs`). `next-auth` est dans `package.json` et n’est importé nulle part.
- Node attendu : 22 (`.nvmrc`). Le Dockerfile part de `node:22-alpine`.
- Auth : jeton Bearer stocké dans `localStorage` (`auth_token`, `auth_user`). Pas de cookie httpOnly, pas de `middleware.ts`.
- Rôles Prisma : `VISITOR`, `CLIENT`, `TRUCKER`, `OPERATOR`, `ADMIN`.
- Migrations présentes, dans l’ordre : `20260730235411_init`, `20260731002419_add_quote_vehicle_notes_withdrawn`, `20260802013334_subscription_wallet_split`, `20260807141014_fix_subscriptionplan_json`, `20260808110727_add_plan_publishing_fields`.
- La migration `subscription_wallet_split` a supprimé `ContactUnlock.paymentId` après un backfill. Elle est déjà dans l’historique. Les prochaines migrations doivent rester additives. Ne pas la réécrire.
- Redis est déclaré dans Docker Compose et n’est lu par aucun service.
- Tests : un seul fichier Playwright (`tests/e2e/application.spec.ts`) : accueil, tarifs, connexion des trois comptes seed, trois pages admin, refus de `/admin` pour un client. Pas de tests unitaires ni d’intégration. Pas de workflow CI (pas de `.github/`).
- Seed de démo : client `72000001`, camionneur `72100001`, admin `72200001`, mot de passe `password123`. Plans `FREE` / `PRO` / `BUSINESS` et packs de crédits.

## Constats transverses, par priorité

### P0 — bloquants pour un lancement commercial

1. **La simulation de paiement attribue de vrais droits.** `PAYMENT_PROVIDER` vaut `orange_money_sandbox` dans `.env.example` et Docker Compose. `OrangeMoneyProvider.verify()` en mode bac à sable renvoie toujours `success` (`lib/payment-provider.ts`). `paymentServiceLayer.confirm()` passe alors le paiement à `SUCCESSFUL` et appelle `applySideEffects()` (`lib/services/payment-service.ts`). Un code PIN quelconque sur `/payments/[id]/confirm` crédite le portefeuille ou active le forfait.
2. **Activation gratuite des forfaits.** `POST /api/subscription/activate` appelle `activateOrRenewSubscription` pour tout utilisateur connecté, sans paiement et sans contrôle du prix (`app/api/subscription/activate/route.ts`).
3. **Fuite des contacts client.** `requestService.search()` renvoie `customer.user.phone` et `email` sans masque (`lib/services/request-service.ts`). `GET /api/requests/browse` est ouvert à tout jeton valide, pas seulement aux camionneurs.
4. **Fuite des contacts camionneur.** `GET /api/quotes?requestId=` renvoie les devis complets, téléphone inclus, au propriétaire de la demande, sans vérifier `ContactUnlock` (`app/api/quotes/route.ts`, `quoteService.getByRequestId`). L’écran de détail masque ces devis tant que le crédit n’est pas dépensé. Cet endpoint contourne le masque.
5. **Déblocage non atomique.** `unlock-contacts` et `unlock-customer-contact` vérifient l’existant, dépensent le crédit, puis créent `ContactUnlock`. Deux requêtes simultanées passent le contrôle, débitent deux fois, et une seule ligne survit grâce à l’unicité `(requestId, unlockedByUserId)`. Si la création échoue après le débit, le crédit est perdu.
6. **Double attribution possible.** Pour un achat de crédits, le contrôle d’idempotence (`creditTransaction.metadata.paymentId`) est hors transaction et sans contrainte d’unicité. Pour un abonnement, `activateOrRenewSubscription` recalcule un nouveau cycle à chaque appel : deux confirmations du même paiement réappliquent les crédits mensuels. Le webhook Orange et le retour navigateur peuvent se croiser.
7. **Session non rattachée au compte réel.** `getAuthContext` ne relit pas `User`. Un compte `BLOCKED`, `SUSPENDED` ou `DELETED` conserve l’accès jusqu’à expiration du JWT (7 jours par défaut). `loginAttempts` est incrémenté, `lockedUntil` n’est jamais écrit ni lu. Le secret JWT retombe sur une chaîne fixe si `JWT_SECRET` est absent (`lib/auth.ts`).
8. **OTP inutilisable en production.** Le code est stocké dans une `Map` mémoire du process et écrit en clair dans les logs (`app/api/auth/signup/route.ts`). L’inscription renvoie déjà un JWT. `phoneVerified` n’est exigé nulle part.

### P1 — à traiter pendant la consolidation

- Pas de `matching-service`. Le modèle `Match` n’est jamais créé par le code applicatif.
- Les statuts de mission acceptent n’importe quelle transition (`missionService.updateStatus`). Pas d’historique écrit à la création de la mission.
- `monthlyBoosts` est affiché et stocké, jamais consommé.
- Neuf pages admin affichent « Page en cours de construction » : contenus, logs, matériaux, notifications, paramètres, promotions, rôles, types de camions, administrateurs.
- Ajustement de crédits, remboursement et validation camionneur sont libellés « à venir » dans l’UI, alors que les listes et le détail existent.
- La recherche globale de la barre admin n’a pas de gestionnaire.
- Le menu admin est `hidden lg:flex` sans équivalent mobile.
- `Permission` / `RolePermission` ne sont consultés par aucune route. Le contrôle admin est un test de rôle sur le JWT, avec une incohérence : la plupart des routes acceptent `SUPER_ADMIN`, `app/api/admin/subscription-plans/route.ts` n’accepte que `ADMIN`.
- Aucune écriture dans `AuditLog`, `Notification`, `PaymentWebhook`.
- Les e-mails d’inscription sont synthétiques : `{téléphone}@wagesse.local`.
- Le back-office peut envoyer un rôle hors enum et un mot de passe de 6 caractères, inférieur au minimum de 8 à l’inscription.
- Pas de CI, pas de sauvegarde, pas de procédure de migration au démarrage. Le Dockerfile de production ne lance pas `prisma migrate deploy`.
- `images.remotePatterns` autorise tout hôte HTTPS.

### P2 — hors du lancement manuel, déjà modélisés

Modèles sans service ni écran opérationnel : notation, litige, conversation, message, ticket support, facture, commission, reversement, preuve de livraison, document et pièce véhicule, organisation, zone de service, réglages plateforme. Variables d’environnement prévues et non lues par le code : SMTP, Twilio, S3, Sentry, Mapbox, Stripe (le provider Stripe renvoie un TODO).

## Modules

Légende : **Réalisé** = parcours codé de bout en bout. **Partiel** = une partie du parcours existe. **Non fonctionnel** = l’écran ou l’endpoint ne fait pas le métier attendu. **Absent** = pas de code opérationnel. Tous les statuts sont issus de la revue de code.

### 1. Authentification et utilisateurs — Partiel

Présent :

- `POST /api/auth/signup` crée l’utilisateur et le profil client ou camionneur dans une transaction. Mot de passe hashé (bcrypt, 10 rounds). Rôles limités à `CLIENT` et `TRUCKER`.
- `POST /api/auth/login` refuse un statut autre que `ACTIVE`, vérifie le mot de passe, pose `lastLoginAt`.
- `POST /api/auth/verify-otp` et `GET /api/auth/me` existent.
- Pages `/auth/login` et `/auth/signup`.

Manques : OTP non bloquant et non distribué, verrouillage de compte inerte, jeton non révoqué, pas de renouvellement de mot de passe, pas de 2FA malgré les colonnes, secret par défaut, jeton en `localStorage`.

Action : relire l’utilisateur à chaque requête privilégiée, refuser les comptes inactifs, supprimer le secret de repli, ne plus logger l’OTP, et ne pas exiger l’OTP tant qu’un canal SMS réel n’existe pas (sinon l’inscription casse).

### 2. Profils clients, camionneurs, agents, administrateurs — Partiel

Présent :

- Profil client créé à l’inscription, ville par défaut Ouagadougou. `GET/PUT /api/profile/customer`.
- Profil camionneur créé à l’inscription. `GET/PUT /api/profile/trucker`.
- Véhicules : `GET/POST /api/vehicles`, page `/dashboard/trucker/vehicles`.
- Admin utilisateurs et camionneurs : listes, recherche, fiche, édition.

Manques : pas de page « mon profil » dans les tableaux de bord. Pas de rôle agent distinct : `OPERATOR` existe dans l’enum et n’a ni garde ni écran. Vérification du camionneur marquée « à venir » (`app/admin/camionneurs/[id]/page.tsx`). Documents non uploadés. Photo de profil non gérée.

### 3. Demandes de transport — Réalisé, avec réserves

Présent : création en `DRAFT`, édition limitée au brouillon, publication `DRAFT → PUBLISHED`, annulation, suppression logique, liste client, formulaire `/dashboard/client/requests/new`. Le texte libre passe par `sanitizeNoContactLeak` (e-mail, URL, téléphone). Admin : liste, filtres, création et fiche (`/admin/annonces`).

Réserves : pas de lien vers le référentiel `Material` depuis le formulaire public (texte libre). Pas d’expiration malgré `expiresAt`. La consultation publique des demandes fuite les contacts (P0).

### 4. Annonces, offres, recherche et filtres — Partiel

Présent : le camionneur liste les demandes publiées (`/dashboard/trucker/requests`) et dépose un devis si la demande est `PUBLISHED`, avec un véhicule qui lui appartient, une seule offre par demande. Retrait et modification de prix tant que le devis est `PENDING`. Filtres de recherche : ville de départ et ville d’arrivée, égalité stricte. Admin offres : liste et fiche.

Manques : pas de filtre matériau, capacité, date, urgence ou distance. Pas de recherche plein texte côté camionneur. La barre de recherche admin n’est pas branchée.

### 5. Matching — Absent (modèle seulement)

`Match` et `MatchStatus` sont dans le schéma. Aucun fichier ne calcule `matchScore` ni n’insère de `Match`. Le plan d’implémentation décrit un scoring (distance, documents, note, abonnement) qui n’a pas été écrit. La mise en relation réelle est une liste chronologique plus un devis manuel.

Action : ne pas construire un moteur de score avant le circuit commercial. Le documenter comme différé, pour ne pas le confondre avec un matching déjà en production.

### 6. Missions et propositions — Partiel

Présent : accepter un devis exige un déblocage, passe le devis à `ACCEPTED`, rejette les autres devis `PENDING`, passe la demande à `ASSIGNED` et crée une `Mission` au statut `ACCEPTED`, le tout dans une transaction (`quoteService.accept`). Pages mission et API de lecture / changement de statut.

Manques : pas de graphe de transitions. Un client peut envoyer `REFUNDED` ou `COMPLETED` directement. Pas de preuve de livraison, pas de paiement de mission, pas de commission calculée, pas d’écriture `MissionStatusHistory` à la création, pas de notification.

### 7. Crédits, portefeuille, historique — Partiel, règles de solde présentes

Présent et à préserver :

- Portefeuille scindé : `purchasedBalance` (n’expire pas) et `subscriptionBalance` (remis à zéro après `subscriptionBalanceExpiresAt` dans `normalizeWalletForExpiry` et à la lecture).
- Dépense : les crédits d’abonnement sont consommés avant les crédits achetés (`spendCredit`).
- Historique `CreditTransaction` : `PURCHASE`, `UNLOCK_CONTACT`, `SUBSCRIPTION_MONTHLY_TOPUP`, `ADMIN_ADJUSTMENT`, `PROMO`.
- Admin : liste et fiche `/admin/wallet` et `/admin/transactions`.

Manques : l’ajustement admin est un bouton « à venir ». Aucune route n’écrit `ADMIN_ADJUSTMENT`. L’expiration n’écrit pas de ligne d’historique, elle met seulement le solde à jour au prochain mouvement. Les courses décrites en P0 peuvent créditer ou débiter deux fois.

### 8. Forfaits, abonnements, avantages — Partiel

Présent : plans en base, publication (`isPublished`, `isVisible`, `archivedAt`, `sortOrder`, `badge`, `benefits`). API publique filtrée. CRUD admin `/admin/abonnements`. Achat via `POST /api/subscription/purchase`, qui fige le prix du plan au moment de l’initialisation du paiement. Activation : crée ou met à jour l’abonnement, `autoRenewal` forcé à `false`, recharge les crédits du cycle. Le seed pose FREE, PRO (5 000 XOF, 10 crédits, 2 boosts) et BUSINESS.

Manques : l’endpoint d’activation directe (P0) court-circuite l’achat. Les boosts et les plafonds `maxVehicles` / `maxRequests` / `maxProposals` ne sont pas appliqués. Pas de renouvellement automatique ni de tâche planifiée. Un second paiement remplace le solde mensuel au lieu de l’empiler, ce qui est cohérent avec un cycle, mais le même paiement peut créer deux cycles.

### 9. Paiements — Partiel, impropre au lancement

Présent, à réutiliser et non à réécrire :

- `PaymentProvider` + `PaymentProviderFactory`.
- `paymentServiceLayer.initialize` crée un `Payment` (`INITIATED`), appelle le provider, enregistre une `PaymentAttempt`.
- Orange Money réel : OAuth2, `webpayment`, URL hébergée, retour `/api/payments/orange-money/return/[paymentId]`, webhook avec contrôle de `notif_token`.
- Effets de bord centralisés dans `applySideEffects` pour `CREDIT_PURCHASE` et `SUBSCRIPTION`.
- Checkout packs `/pricing/checkout` et forfaits `/pricing/subscription-checkout`.
- Admin paiements : liste, recherche, fiche. Le remboursement est « à venir ». `refund()` réel d’Orange Money retourne une erreur explicite.

Absent pour la mission : mode `MANUAL`, adaptateur PayDunya, sélection de mode, gel d’un snapshot de commande distinct du paiement provider, file d’attente admin.

Le bac à sable ne doit plus pouvoir attribuer de crédits dès que `NODE_ENV=production`, et le mode de lancement doit être `MANUAL`.

### 10. Back-office et habilitations — Partiel

Opérationnel : garde client `AdminGuard`, APIs admin protégées par le rôle du JWT, tableaux annonces, offres, transports, utilisateurs, camionneurs, transactions, paiements, wallet, abonnements, tarifs (CRUD packs, suppression refusée avec 409 si le pack est déjà référencé par un paiement).

Non opérationnel : pages coquilles listées plus haut, permissions en base inutilisées, pas de journal, pas de garde serveur sur les pages (le HTML part au navigateur, les données restent derrière l’API), menu inutilisable sous la largeur `lg`, recherche globale factice.

### 11. Notifications, documents, vérification — Non fonctionnel

Le schéma `Notification`, `Document`, `VehicleDocument`, `VerificationStatus` est complet. Aucun `prisma.notification.create`, aucun upload, aucun e-mail, aucun SMS. L’admin notifications est une coquille. La validation de profil est un libellé « à venir ». Le masquage anti-fuite des champs texte (`lib/anti-leak.ts`) fonctionne, mais il ne couvre pas les objets relationnels renvoyés par browse et par la liste des devis.

### 12. Responsive, sécurité, API, performances, déploiement — Partiel

Responsive : landing, auth et tableaux de bord utilisent Header / Tailwind et restent utilisables sur un écran étroit. L’admin ne l’est pas. Aucun test mobile dans Playwright (projet Chromium desktop uniquement).

Sécurité : voir P0. En plus, les pages client ne vérifient que la présence du jeton, pas le rôle. Un camionneur peut ouvrir `/dashboard/client`. Pas de limite de débit. Le webhook Orange répond HTTP 200 même en cas d’erreur interne, ce qui évite les retries mais masque les échecs.

API : conventions REST cohérentes, validation Zod sur les parcours utilisateur, moins stricte sur plusieurs PATCH admin (`as any`).

Performances : pas de cache applicatif. Les listes admin sont paginées. Redis inutilisé. Rien à optimiser avant d’avoir corrigé les fuites et l’atomicité.

Déploiement : Docker Compose de développement avec mots de passe en clair (acceptables uniquement en local). Image de production sans utilisateur non-root dédié au-delà de l’image alpine par défaut, sans migration, sans healthcheck base de données. `.env.example` contient des noms de secrets et des valeurs factices (`sandbox_client_id`, clé Stripe de test). Aucune clé réelle n’a été trouvée dans le dépôt. `.env` est ignoré. `.env.example` est versionné, ce qui est correct tant que les valeurs restent fictives.

## Ce qui doit être préservé

- Le design, les routes et les composants existants.
- La séparation crédits achetés / crédits mensuels et l’ordre de dépense.
- Le CRUD admin des plans et des packs, y compris le refus de supprimer un pack déjà utilisé.
- `paymentServiceLayer` et l’adaptateur Orange Money, étendus par un mode et un adaptateur, pas remplacés.
- L’historique des migrations. Toute évolution de schéma passe par une nouvelle migration additive.
- Les parcours demande → publication → devis → déblocage → acceptation → mission.

## Preuve et limite de cet audit

Preuve : lectures ciblées des fichiers cités, sur le commit `bf64432`.
Limite : aucun `npm run lint`, `typecheck`, `build` ni Playwright n’a été exécuté ici, faute de dépendances installées et de base MySQL. La phase de consolidation devra produire ces preuves avant de déclarer un correctif terminé.
