# Matrice fonctionnelle WAGESSE

Référence : cahier des charges décrit dans le README, `IMPLEMENTATION_PLAN.md` et la mission de mise en production (circuit manuel, puis PayDunya).
État au commit `bf64432`. Revue de code du 6 novembre 2026 (Europe/Paris). Aucun parcours n’a été rejoué sur une base.

Statuts : **Réalisé**, **Partiel**, **Non fonctionnel**, **Absent**.

## Authentification et comptes

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Inscription client ou camionneur | Réalisé | `app/api/auth/signup/route.ts`, `app/auth/signup` | L’e-mail est fabriqué (`{phone}@wagesse.local`). Le JWT est émis avant toute vérification. | Conserver le parcours. Ne pas bloquer sur l’OTP tant qu’aucun SMS n’est branché. |
| Connexion par téléphone et mot de passe | Réalisé | `app/api/auth/login/route.ts`, `app/auth/login` | Compte inactif refusé seulement à la connexion. | Relire `User.status` dans `getAuthContext`. |
| Vérification OTP | Non fonctionnel | `generateOTP`, `storeOTP`, `POST /api/auth/verify-otp` | Code en mémoire process, loggé en clair, non exigé. | Retirer le log. Brancher un canal réel avant d’en faire un prérequis. |
| Verrouillage après échecs | Absent | Colonnes `loginAttempts`, `lockedUntil` | Le compteur monte, le verrou n’est jamais posé. | Écrire `lockedUntil` après un seuil et le respecter à la connexion. |
| Jeton de session | Partiel | `lib/auth.ts`, `lib/api-client.ts` | `localStorage`, secret de repli, durée 7 jours, rôle figé dans le jeton. | Refuser le démarrage sans `JWT_SECRET`. Revérifier le rôle en base pour les routes admin. |
| Mot de passe oublié | Absent | — | — | Différé, hors lancement commercial. |
| Double authentification | Absent | Colonnes `twoFactorEnabled`, `twoFactorSecret` | Jamais lues. | Ne pas exposer l’option tant que le flux n’existe pas. |
| Rôles visiteur, client, camionneur, opérateur, admin | Partiel | Enum `Role`, `lib/role-routing.ts` | `OPERATOR` sans écran. `SUPER_ADMIN` dans l’UI admin seulement. | Aligner l’UI sur l’enum. Ne pas inventer de rôle sans migration. |

## Profils

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Profil client (société, ville, type) | Partiel | `CustomerProfile`, `GET/PUT /api/profile/customer` | Pas d’écran « mon profil ». Ville par défaut Ouagadougou. | Conserver l’API. Écran profil seulement s’il manque au parcours de lancement. |
| Profil camionneur | Partiel | `TruckerProfile`, `GET/PUT /api/profile/trucker` | Permis, assurance, zones et disponibilité non saisis par l’UI. | Ne pas bloquer la publication de demandes. |
| Véhicules du camionneur | Réalisé | `app/api/vehicles/route.ts`, `/dashboard/trucker/vehicles` | Pas de pièces jointes ni de contrôle technique. | Conserver le CRUD minimal. |
| Organisations et chauffeurs | Absent | Modèles `Organization`, `Driver` | Aucune route. | Différé. |
| Vérification admin des profils | Non fonctionnel | Fiche `/admin/camionneurs/[id]` | Bouton « Valider / Rejeter (à venir) ». | À brancher sur `verificationStatus` avec journal d’audit, sans supprimer la fiche actuelle. |
| Agents | Absent | — | Le métier « agent » n’a pas d’agrégat. | Traiter `OPERATOR` comme un admin restreint seulement après définition des permissions. |

## Demandes, annonces, offres

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Créer une demande (brouillon) | Réalisé | `requestService.create`, `/dashboard/client/requests/new` | Matériau en texte libre, pas d’id `Material`. | Conserver. Le référentiel admin matériaux est encore une coquille. |
| Modifier un brouillon | Réalisé | `requestService.update` | Refus hors `DRAFT`. | Conserver cette règle. |
| Publier | Réalisé | `POST /api/requests/[id]/publish` | Pas de paiement à la publication. Cohérent avec le modèle au crédit. | Conserver. |
| Annuler / retirer | Réalisé | `cancel`, `delete` (soft) | — | Conserver. |
| Consulter ses demandes | Réalisé | `/dashboard/client/requests` | — | Conserver. |
| Parcourir les demandes publiées | Partiel | `GET /api/requests/browse` | Téléphone et e-mail du client non masqués. Filtre ville en égalité exacte. | Masquer comme dans `getPublicByIdForUser`. Élargir les filtres ensuite. |
| Déposer une offre | Réalisé | `quoteService.create` | Un devis par camionneur et par demande. Véhicule obligatoire. | Conserver. |
| Retirer ou ajuster son prix | Réalisé | `withdraw`, `updatePrice` | Uniquement `PENDING`. | Conserver. |
| Voir les offres reçues sans payer | Partiel | `requestService.getById` masque prix et identité | `GET /api/quotes?requestId=` renvoie le téléphone du camionneur quand même. | Appliquer le même masque que le détail. |
| Recherche admin des annonces et offres | Réalisé | `/admin/annonces`, `/admin/offres` | — | Conserver. |
| Filtres avancés (capacité, urgence, date, distance) | Absent | `search()` ne filtre que deux villes | — | Après correction de la fuite. |

## Matching et missions

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Score de compatibilité | Absent | Modèle `Match` uniquement | Aucun calcul. | Différé. Ne pas le présenter comme livré. |
| Accepter une offre et ouvrir une mission | Réalisé | `quoteService.accept` | Exige un `ContactUnlock`. Transaction Prisma. | Conserver. Ajouter une ligne d’historique de statut à la création. |
| Refuser une offre | Réalisé | `quoteService.reject` | — | Conserver. |
| Suivi des statuts de mission | Partiel | `PATCH /api/missions/[id]/status` | Toute transition est acceptée, y compris `REFUNDED`. | Introduire une table de transitions sans retirer les statuts existants. |
| Preuve de livraison, OTP, GPS | Absent | Modèle `DeliveryProof` | Aucune route. | Différé. |
| Notation | Absent | Modèle `Rating` | Aucune route. | Différé. |
| Litiges | Absent | Modèle `Dispute` | Aucune route. | Différé. |
| Messagerie interne | Absent | `Conversation`, `Message` | Aucune route. | Le contact passe aujourd’hui par le déblocage. |

## Crédits et forfaits

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| 1 crédit débloque un contact, coût configurable | Partiel | `getUnlockCostCreditsForUser`, défaut 1 | Le coût suit le plan actif. | Conserver la règle. |
| Crédits achetés non expirants | Réalisé | `purchasedBalance` jamais remis à zéro par l’expiration | — | Ne pas fusionner les deux soldes. |
| Crédits mensuels expirants | Réalisé | `normalizeWalletForExpiry`, `subscriptionBalanceExpiresAt` | L’expiration n’écrit pas de mouvement. | Ajouter une écriture lors du reset, sans changer le solde résultant. |
| Dépense : mensuels puis achetés | Réalisé | `spendCredit` | — | Conserver l’ordre. |
| Packs pilotés par la base | Partiel | `CreditPack`, `/admin/tarifs`, `GET /api/credits/packs` | Repli codé en dur si la table est vide ou en erreur. | En production, renvoyer une liste vide plutôt qu’un prix fictif. |
| Plans pilotés par la base | Réalisé | `GET /api/subscription/plans` filtre actif, publié, visible, non archivé | — | Conserver. |
| Achat de pack au prix base | Partiel | `POST /api/credits/purchase` fige `credits` et `packCode` dans les métadonnées | Le prix vivant est celui du `Payment.amount`. L’effet de bord ne revérifie pas le pack. | Figer aussi le prix dans un snapshot de commande. |
| Achat de forfait | Partiel | `POST /api/subscription/purchase` | Contourné par `POST /api/subscription/activate`. | Retirer ou réserver l’activation directe à un admin, et seulement pour le plan gratuit explicite. |
| Avantages et badge affichés | Réalisé | `/pricing`, seed, admin abonnements | — | Conserver. |
| Boosts appliqués au classement | Absent | Champ `monthlyBoosts` affiché | Aucune consommation. | Ne pas promettre l’effet tant que le matching n’existe pas. Le texte marketing reste éditable en admin. |
| Plafonds véhicules / demandes / offres | Absent | Colonnes du plan | Non lus par les services. | Différé. |
| Historique des mouvements | Partiel | `CreditTransaction`, `/admin/transactions` | Pas d’écran historique côté utilisateur dédié au-delà du solde. | L’afficher dans le portefeuille existant. |
| Ajustement manuel avec motif | Absent | Type `ADMIN_ADJUSTMENT` prévu | Bouton « Ajuster crédits (à venir) ». | Le livrer dans le circuit manuel, avec audit. |

## Paiements

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Abstraction multi-provider | Partiel | `lib/payment-provider.ts` | Orange Money réel + bac à sable. Stripe : TODO. | Ajouter PayDunya à côté, sans retirer Orange Money. |
| Bac à sable de développement | Non fonctionnel pour la prod | `verify()` renvoie toujours `success` | Attribue de vrais crédits. | Interdire `applySideEffects` si le provider est le bac à sable et `NODE_ENV=production`. |
| Orange Money Web Payment | Partiel | `charge`, `verify`, retour, webhook `notif_token` | Non prouvé sans clés. Idempotence incomplète. | Conserver. Renforcer la transaction unique. |
| Webhook enregistré | Absent | Modèle `PaymentWebhook` | Le handler ne persiste pas l’événement. | Écrire la charge utile avant traitement. |
| Remboursement | Non fonctionnel | Fiche admin, `refund()` | Libellé « à venir ». L’API Orange ne rembourse pas en self-service. | Laisser le statut manuel, sans simuler un remboursement provider. |
| Circuit manuel : choix, demande, attente, validation, attribution | Absent | — | Aucune table de commande commerciale. | Phase 2. Nouvelle migration additive. |
| PayDunya | Absent | — | — | Phase 3, clés uniquement en variables d’environnement. |
| Choix de mode `MANUAL` / `PAYDUNYA` | Absent | `PAYMENT_PROVIDER` seulement | — | `PAYMENT_MODE`, défaut `MANUAL`. |
| Ledger, commissions, reversements, factures | Absent | Modèles `Transaction`, `LedgerEntry`, `Commission`, `Payout`, `Invoice` | Aucun service. | Hors lancement crédits. Ne pas les supprimer. |

## Back-office

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Garde d’accès admin | Partiel | `AdminGuard`, tests de rôle dans `app/api/admin/**` | Garde navigateur seulement. Rôle lu dans le JWT. `subscription-plans` ignore `SUPER_ADMIN`. | Contrôle serveur du rôle relu en base. |
| Tableau de bord | Partiel | `/admin`, `GET /api/admin/dashboard` | — | Conserver. |
| Annonces, offres, transports | Réalisé | Pages et routes admin correspondantes | — | Conserver. |
| Utilisateurs et camionneurs | Partiel | Listes, fiches, PATCH | Rôle non validé contre l’enum. Validation profil non branchée. | Valider l’enum. Journaliser. |
| Packs et abonnements | Réalisé | `/admin/tarifs`, `/admin/abonnements` | — | Conserver, y compris le 409 à la suppression. |
| Paiements et transactions | Partiel | Listes et fiches | Actions de remboursement et d’ajustement non branchées. | Les ajouter dans le circuit manuel. |
| File des demandes commerciales | Absent | — | — | Nouvelle section, sans retirer les paiements existants. |
| Promotions, contenus, matériaux, types de camions, rôles, administrateurs, paramètres, journal, notifications | Non fonctionnel | Pages dédiées | Texte « Page en cours de construction ». | Ne pas les supprimer. Les remplir seulement si le lancement en dépend (journal et file commerciale : oui). |
| Recherche globale | Non fonctionnel | `AdminTopbar` | Champ sans état ni requête. | Soit la brancher, soit ne pas la présenter comme active. |
| Journal d’audit | Absent | Modèle `AuditLog` | Aucune écriture. Page coquille. | Écrire à chaque attribution, refus et ajustement. |

## Notifications, documents, canaux

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Notification in-app | Absent | Modèle `Notification` | Aucun `create`. | Créer les notifications de commande (admin et utilisateur) dans ce modèle. |
| E-mail transactionnel | Absent | Variables SMTP dans `.env.example` | Aucun envoi. | Prévoir l’interface. Ne pas inventer de fournisseur tant que les accès manquent. |
| SMS / WhatsApp | Absent | Variables Twilio | OTP seulement loggé. | Différé. |
| Upload de documents | Absent | Modèles `Document`, `VehicleDocument`, variables S3 | Aucune route d’upload. | Différé. |
| Masquage des coordonnées dans les textes | Réalisé | `lib/anti-leak.ts` | Ne couvre pas les relations renvoyées telles quelles. | Corriger les deux endpoints P0. |

## Qualité, mobile, exploitation

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Mobile first, liaisons lentes | Partiel | Tailwind, pages publiques et dashboards | Admin sans navigation sous `lg`. Pas de test mobile. | Menu admin repliable. Garder les pages légères. |
| Tests automatiques | Partiel | `tests/e2e/application.spec.ts` | Smoke uniquement. Exige un build et une base seedée. | Étendre après les correctifs P0. Voir le plan de non-régression. |
| Lint, types, build | Non vérifié dans cet audit | Scripts `lint`, `typecheck`, `build`, `validate` | Dépendances non installées ici. | Les exécuter en phase de consolidation. |
| CI | Absent | Pas de `.github/workflows` | — | Pipeline lint, types, build, puis e2e avec MySQL. |
| Migrations non destructives | Partiel | 5 migrations, lock MySQL | `subscription_wallet_split` a déjà supprimé une colonne, avec backfill. Historique à ne pas réécrire. | Nouvelles migrations additives uniquement. `migrate deploy`, jamais `migrate reset`. |
| Sauvegardes, supervision, HTTPS, domaine | Absent | Sentry nommé dans l’exemple d’environnement et non branché | — | Phase 5, sans déploiement tant que les accès manquent. |
| Secrets hors du frontend | Partiel | Clés provider lues côté serveur | `.env.example` a des valeurs factices. Le bac à sable et l’OTP passent par des logs. | Aucune clé PayDunya dans le client ni dans Git. |
