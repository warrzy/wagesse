# Matrice fonctionnelle WAGESSE

Référence : cahier des charges décrit dans le README, `IMPLEMENTATION_PLAN.md` et les phases 1 à 3.
État après la phase 3, branche `cursor/phase3-launch-readiness-ba0b`, le 6 novembre 2026 (Europe/Paris). La revue initiale au commit `bf64432` est conservée dans l’historique Git. Les lignes ci-dessous décrivent le code actuel.

Statuts : **Réalisé**, **Partiel**, **Non fonctionnel**, **Absent**.

## Authentification et comptes

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Inscription client ou camionneur | Réalisé | `app/api/auth/signup/route.ts`, `lib/otp-delivery.ts`, `lib/sms.ts` | L’e-mail reste synthétique (`{phone}@wagesse.local`). Le téléphone est l’identité. Le code part par SMS (simulation ou HTTP). | Conserver. Ne pas ajouter de vérification e-mail tant que l’adresse n’est pas saisie. |
| Connexion par téléphone et mot de passe | Réalisé | `app/api/auth/login/route.ts` | Un mot de passe correct sur un compte `BLOCKED`, `SUSPENDED`, `DELETED` ou archivé répond 403. Un mauvais mot de passe reste 401. | Conserver cet ordre. |
| Vérification OTP | Partiel | `issueOtp`, `POST /api/auth/verify-otp`, `POST /api/auth/resend-otp` | Code haché, non loggé, exigé pour les actions commerciales. Stockage en mémoire du process. En production, l’envoi dépend de `SMS_HTTP_URL` et `SMS_HTTP_KEY`. | Un magasin partagé si plusieurs instances. |
| Verrouillage après échecs | Réalisé | `lib/auth.ts` | 5 échecs de connexion verrouillent 15 minutes. 5 essais OTP puis verrou 15 minutes. Renvoi limité. | Conserver. |
| Jeton de session | Réalisé | `getAuthContext` | Rôle et statut relus en base. Sans `JWT_SECRET`, la production refuse de signer. Jeton toujours dans `localStorage`. | Conserver. |
| Mot de passe oublié | Réalisé | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `/auth/forgot` | Réponse générique si le numéro est inconnu. Un compte bloqué n’est pas réactivé. | Conserver. |
| Double authentification | Absent | Colonnes `twoFactorEnabled`, `twoFactorSecret` | Jamais lues. | Ne pas exposer l’option tant que le flux n’existe pas. |
| Rôles visiteur, client, camionneur, opérateur, admin | Partiel | Enum `Role`, `lib/role-routing.ts`, fiche utilisateur | `OPERATOR` sans écran. `SUPER_ADMIN` retiré du sélecteur : l’enum ne le contient pas. | Définir les permissions `OPERATOR` après le lancement. |

## Profils

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Profil client (société, ville, type) | Réalisé | `GET/PUT /api/profile/customer`, `/dashboard/client/profil` | Ville, société et secteur. Ville par défaut Ouagadougou à l’inscription. | Conserver. |
| Profil camionneur | Partiel | `GET/PUT /api/profile/trucker`, `/dashboard/trucker/profil` | Ville, permis et numéro Orange Money. Assurance et pièces jointes absentes. | Ne pas bloquer les devis. |
| Véhicules du camionneur | Réalisé | `app/api/vehicles/route.ts`, `/dashboard/trucker/vehicles` | Pas de pièces jointes ni de contrôle technique. | Conserver le CRUD minimal. |
| Organisations et chauffeurs | Absent | Modèles `Organization`, `Driver` | Aucune route. | Différé. |
| Vérification admin des profils | Réalisé | Fiche `/admin/camionneurs/[id]`, `PATCH /api/admin/camionneurs/[id]` | Boutons Valider et Refuser. Journal `verify_trucker` et notification `PROFILE_VALIDATED` ou `PROFILE_REJECTED`. | Conserver. |
| Agents | Absent | — | Le métier « agent » n’a pas d’agrégat. | Traiter `OPERATOR` comme un admin restreint seulement après définition des permissions. |

## Demandes, annonces, offres

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Créer une demande (brouillon) | Réalisé | `requestService.create`, `/dashboard/client/requests/new` | Matériau en texte libre, pas d’id `Material`. | Conserver. Le référentiel admin matériaux est encore une coquille. |
| Modifier un brouillon | Réalisé | `requestService.update` | Refus hors `DRAFT`. | Conserver cette règle. |
| Publier | Réalisé | `POST /api/requests/[id]/publish` | Pas de paiement à la publication. Cohérent avec le modèle au crédit. | Conserver. |
| Annuler / retirer | Réalisé | `cancel`, `delete` (soft) | — | Conserver. |
| Consulter ses demandes | Réalisé | `/dashboard/client/requests` | — | Conserver. |
| Parcourir les demandes publiées | Réalisé | `GET /api/requests/browse`, `search()` | Coordonnées masquées hors déblocage. Filtre ville en `contains`. | Conserver. |
| Déposer une offre | Réalisé | `quoteService.create` | Un devis par camionneur et par demande. Véhicule obligatoire. | Conserver. |
| Retirer ou ajuster son prix | Réalisé | `withdraw`, `updatePrice` | Uniquement `PENDING`. | Conserver. |
| Voir les offres reçues sans payer | Réalisé | `quoteService`, masque `contact-privacy` | Prix et coordonnées masqués tant que le contact n’est pas débloqué. L’admin voit les contacts. | Conserver. |
| Recherche admin des annonces et offres | Réalisé | `/admin/annonces`, `/admin/offres` | — | Conserver. |
| Filtres avancés (capacité, urgence, date, distance) | Partiel | `search()` filtre les villes en inclusion | Capacité, urgence et distance non filtrées. Suffisant pour la première version : le camionneur parcourt puis envoie un devis. | Score automatique après le lancement. |

## Matching et missions

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Score de compatibilité | Absent | Modèle `Match` uniquement | Aucun calcul. La recherche et la notification par ville couvrent le lancement. | Feuille de route post-lancement. |
| Accepter une offre et ouvrir une mission | Réalisé | `quoteService.accept` | Exige un `ContactUnlock`. Historique `ACCEPTED` écrit dans la même transaction. Notification au camionneur. | Conserver. |
| Refuser une offre | Réalisé | `quoteService.reject` | — | Conserver. |
| Suivi des statuts de mission | Réalisé | `lib/mission-transitions.ts`, `PATCH /api/missions/[id]/status` | Le camionneur avance étape par étape jusqu’à la remise. Le client confirme. Une transition illégale répond 400. Notification à l’autre partie. | Conserver le graphe aligné sur l’écran existant. |
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
| Packs pilotés par la base | Réalisé | `CreditPack`, `/admin/tarifs`, `GET /api/credits/packs` | Plus de prix de repli codé en dur. | Conserver. |
| Plans pilotés par la base | Réalisé | `GET /api/subscription/plans` filtre actif, publié, visible, non archivé | — | Conserver. |
| Achat de pack au prix base | Réalisé | `CommercialOrder` + `POST /api/credits/purchase` | Le snapshot de prix est figé à la création. L’attribution suit l’approbation manuelle. | Conserver. |
| Achat de forfait | Réalisé | `POST /api/subscription/purchase`, `POST /api/subscription/activate` | Un prix supérieur à 0 répond 403 `PAYMENT_REQUIRED`. Le plan à 0 peut encore s’activer. | Conserver. |
| Avantages et badge affichés | Réalisé | `/pricing`, seed, admin abonnements | — | Conserver. |
| Boosts appliqués au classement | Absent | Champ `monthlyBoosts` affiché | Aucune consommation. | Ne pas promettre l’effet tant que le matching n’existe pas. Le texte marketing reste éditable en admin. |
| Plafonds véhicules / demandes / offres | Absent | Colonnes du plan | Non lus par les services. | Différé. |
| Historique des mouvements | Partiel | `CreditTransaction`, `/admin/transactions` | Pas d’écran historique côté utilisateur dédié au-delà du solde. | L’afficher dans le portefeuille existant. |
| Ajustement manuel avec motif | Réalisé | `/admin/wallet/[id]` | Ajustement administrateur du portefeuille. | Conserver. |

## Paiements

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Abstraction multi-provider | Partiel | `lib/payment-provider.ts` | Orange Money réel + bac à sable. Stripe : TODO. | Ajouter PayDunya à côté, sans retirer Orange Money. |
| Bac à sable de développement | Réalisé | `lib/payment-policy.ts` | En production, un paiement bac à sable lève `SANDBOX_DISABLED` et ne devient pas `SUCCESSFUL`. | Conserver. |
| Orange Money Web Payment | Partiel | `charge`, `verify`, retour, webhook `notif_token` | Non prouvé sans clés. Idempotence incomplète. | Conserver. Renforcer la transaction unique. |
| Webhook enregistré | Absent | Modèle `PaymentWebhook` | Le handler ne persiste pas l’événement. | Écrire la charge utile avant traitement. |
| Remboursement | Non fonctionnel | Fiche admin, `refund()` | Libellé « à venir ». L’API Orange ne rembourse pas en self-service. | Laisser le statut manuel, sans simuler un remboursement provider. |
| Circuit manuel : choix, demande, attente, validation, attribution | Réalisé | `CommercialOrder`, `/admin/commandes`, `/dashboard/commandes` | Approbation atomique, paiement `manual`, crédits attribués une seule fois. | Conserver. Aucun appel PayDunya réel. |
| PayDunya | Partiel | `lib/paydunya.ts` | Adaptateur inactif. Confirmation serveur exigée avant attribution. Aucune clé dans Git. | Rester inactif jusqu’à autorisation explicite. |
| Choix de mode `MANUAL` / `PAYDUNYA` | Réalisé | `PAYMENT_MODE`, défaut `MANUAL` | En production, `PAYDUNYA` retombe sur `MANUAL` tant que `PAYDUNYA_ENABLED` n’est pas `true`. | Conserver. |
| Ledger, commissions, reversements, factures | Absent | Modèles `Transaction`, `LedgerEntry`, `Commission`, `Payout`, `Invoice` | Aucun service. | Hors lancement crédits. Ne pas les supprimer. |

## Back-office

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Garde d’accès admin | Réalisé | `getAuthContext`, `isAdminRole` | Le rôle est relu en base. Un client qui appelle `/api/admin/logs` reçoit 401. | Conserver. |
| Tableau de bord | Partiel | `/admin`, `GET /api/admin/dashboard` | — | Conserver. |
| Annonces, offres, transports | Réalisé | Pages et routes admin correspondantes | — | Conserver. |
| Utilisateurs et camionneurs | Réalisé | Listes, fiches, PATCH | Rôle et statut validés contre l’enum. Changements journalisés. Comptes bloqués gérés depuis la fiche. | Conserver. |
| Packs et abonnements | Réalisé | `/admin/tarifs`, `/admin/abonnements` | — | Conserver, y compris le 409 à la suppression. |
| Paiements et transactions | Partiel | Listes et fiches | Actions de remboursement et d’ajustement non branchées. | Les ajouter dans le circuit manuel. |
| File des demandes commerciales | Réalisé | `/admin/commandes` | Liste, détail, approbation et refus. | Conserver. |
| Journal, notifications, paramètres, administrateurs | Réalisé | `/admin/logs`, `/admin/notifications`, `/admin/parametres`, `/admin/administrateurs` | Lecture des journaux, des notifications et du mode de paiement. Aucun secret affiché. Liste des comptes `ADMIN`. | Conserver. |
| Promotions, contenus, matériaux, types de camions, rôles | Non fonctionnel | Pages dédiées | Texte « Page en cours de construction ». | Feuille de route. Ne pas les supprimer. |
| Recherche globale | Non fonctionnel | `AdminTopbar` | Champ sans requête. | Après le lancement. Ne pas la présenter comme active. |
| Journal d’audit | Partiel | `AuditLog`, `writeAudit` | Écritures sur le rôle, le statut, l’archivage et la vérification transporteur. Les commandes ont leur propre historique `CommercialOrderEvent`. | Étendre aux autres mutations après le lancement. |

## Notifications, documents, canaux

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Notification in-app | Réalisé | `lib/notify.ts`, `Notification` | Publication, devis, acceptation, changement de mission, commande en attente, approbation, refus, validation de profil. Message limité à 191 caractères. | Conserver. Pas de push externe. |
| E-mail transactionnel | Absent | Variables SMTP dans `.env.example` | L’e-mail d’inscription n’est pas une adresse réelle. Aucun envoi. | Ne pas en faire un canal d’identité. |
| SMS | Partiel | `lib/sms.ts` | Fournisseur `simulate` ou `http`. Indicatif 226. Simulation interdite en production sans `SMS_ALLOW_SIMULATE=true`. Le corps n’est pas loggé. | Renseigner `SMS_HTTP_URL` et `SMS_HTTP_KEY` avant la préproduction réelle. |
| Upload de documents | Absent | Modèles `Document`, `VehicleDocument`, variables S3 | Aucune route d’upload. | Différé. |
| Masquage des coordonnées dans les textes | Réalisé | `lib/anti-leak.ts` | Ne couvre pas les relations renvoyées telles quelles. | Corriger les deux endpoints P0. |

## Qualité, mobile, exploitation

| Fonction attendue | Statut | Preuve | Écart | Action proposée |
| --- | --- | --- | --- | --- |
| Mobile first, liaisons lentes | Partiel | Tailwind, menu admin sous `lg` | Le menu back-office s’ouvre par le bouton Menu. Les formulaires d’auth et de profil restent en colonne. | Vérifier le rendu mobile en recette. |
| Tests automatiques | Réalisé | `tests/unit`, `tests/integration`, `tests/e2e` | 12 unitaires, 12 d’intégration, 14 Playwright après la phase 3. Voir `docs/PHASE3_TEST_RESULTS.md`. | Rejouer avant chaque recette. |
| Lint, types, build | Réalisé | Scripts `lint`, `typecheck`, `build` | Relancés en phase 3. | Les garder dans la recette. |
| CI | Absent | Pas de `.github/workflows` | — | Pipeline lint, types, build, puis e2e avec MySQL. |
| Migrations non destructives | Partiel | 5 migrations, lock MySQL | `subscription_wallet_split` a déjà supprimé une colonne, avec backfill. Historique à ne pas réécrire. | Nouvelles migrations additives uniquement. `migrate deploy`, jamais `migrate reset`. |
| Sauvegardes, supervision, HTTPS, domaine | Absent | Sentry nommé dans l’exemple d’environnement et non branché | — | Phase 5, sans déploiement tant que les accès manquent. |
| Secrets hors du frontend | Réalisé | `.env.example` | Clés PayDunya et SMS vides. OTP absent des logs. `debugOtp` seulement hors production et si `OTP_DEBUG_RETURN=true`. | Ne jamais committer `.env`. |
