# Audit fonctionnel — phase 3

Date : 6 novembre 2026 (Europe/Paris).
Base de travail : branche `cursor/manual-payment-guards-ba0b`, commit `8d813ae`, qui contient déjà la phase 1 (`c051162`) et la phase 2. `main` reste sur `bf64432`. Aucune modification n’a été poussée sur `main`.

La phase 3 part de ce code. Aucune migration Prisma n’a été ajoutée ni réécrite.

## Vérification préalable

| Contrôle | Constat |
| --- | --- |
| PR #2 | https://github.com/warrzy/wagesse/pull/2 — audit documentaire, base `main`. |
| PR #3 | https://github.com/warrzy/wagesse/pull/3 — sécurisation et paiement manuel. Son historique inclut les commits de la PR #2. |
| Dépendance | `merge-base` de la phase 2 avec `main` = `bf64432`. La branche de phase 3 est créée depuis `8d813ae`. |
| Migrations | 6 migrations déjà appliquées en phase 2. Checksums historiques corrigés (identifiants PascalCase). Aucune migration destructive en phase 3. |
| Parcours existants | Les services de demande, devis, crédit, commande manuelle et PayDunya inactif sont conservés. Les ajouts se branchent dessus. |

La matrice `docs/FUNCTIONAL_MATRIX.md` décrit désormais l’état après la phase 3.

## Inscription, connexion, vérification, récupération

Le téléphone est l’identité du produit. L’e-mail créé à l’inscription est `{phone}@wagesse.local`. Une vérification par e-mail ne prouverait pas l’identité et n’a pas été ajoutée.

| Parcours | État avant phase 3 | Décision |
| --- | --- | --- |
| Inscription client ou camionneur | Compte créé, OTP en mémoire, non envoyé | Envoi SMS via `issueOtp`. Le compte est créé même si l’envoi échoue ; l’écran de vérification indique `sent=0` et propose un renvoi. |
| Connexion | Mot de passe, verrou après 5 échecs, statut relu pour les routes protégées | Un mot de passe correct sur un compte inactif répond 403 `ACCOUNT_DISABLED`. Un mauvais mot de passe reste 401. |
| OTP | Haché, non loggé, exigé pour les actions commerciales | Conservé. Le code n’est plus seulement stocké : il est remis au canal SMS. `debugOtp` uniquement hors production et si `OTP_DEBUG_RETURN=true`. |
| Mot de passe oublié | Absent | Ajouté. Réponse identique si le numéro est inconnu. Le compte bloqué n’est pas réouvert. |
| Double authentification | Colonnes présentes, jamais lues | Laissée hors lancement. |

Limite connue : le magasin OTP est en mémoire. Un redémarrage ou une seconde instance invalide les codes en cours.

## Parcours métier

Les parcours client, camionneur et administrateur existaient déjà pour le cœur commercial (demande, devis, déblocage, mission, commande manuelle, tarifs). La phase 3 comble les trous qui empêchaient une recette de bout en bout.

**Client.** Inscription, profil (`/dashboard/client/profil`), création, recherche, modification et suivi des demandes, comparaison des devis, acceptation après déblocage, suivi de mission. Les coordonnées restent masquées tant que le contact n’est pas débloqué.

**Camionneur.** Inscription, profil (ville, permis, Orange Money), véhicules, recherche des demandes publiées (filtre ville en inclusion), envoi de devis, déblocage selon le portefeuille, avancement de mission selon le graphe déjà affiché à l’écran.

**Administrateur.** Utilisateurs, comptes bloqués, rôle limité à l’enum, vérification des transporteurs, supervision des annonces, devis et missions, commandes manuelles, crédits, forfaits et tarifs, journal d’audit, notifications internes, paramètres de mode (sans secret), liste des administrateurs. Les signalements n’ont pas de file dédiée : le statut `DISPUTED` d’une mission et le journal couvrent le minimum de lancement. L’historique des commandes reste `CommercialOrderEvent`.

## Écrans administratifs incomplets

Neuf coquilles étaient signalées. Quatre sont nécessaires au lancement et ont été remplies en lecture sur les tables existantes :

- `/admin/logs` — 100 dernières lignes `AuditLog`
- `/admin/notifications` — 100 dernières notifications
- `/admin/parametres` — mode de paiement, drapeau PayDunya, état SMS
- `/admin/administrateurs` — utilisateurs de rôle `ADMIN`

Restent des coquilles, volontairement : contenus, matériaux, promotions, rôles, types de camions. La recherche globale du bandeau n’est pas branchée.

## Matching

Le modèle `Match` n’a aucun service. Le camionneur trouve les demandes par la recherche et le filtre de ville. À la publication, les transporteurs actifs dont la ville contient la ville d’enlèvement (200 au plus) et les administrateurs actifs reçoivent une notification interne.

Un score automatique n’est pas indispensable à la première version commerciale. Il est reporté.

## Notifications essentielles

Toutes passent par le modèle `Notification` déjà présent. Le message est coupé à 191 caractères.

| Événement | Destinataire | Type |
| --- | --- | --- |
| Demande publiée | Client, camionneurs de la ville, admins | `SYSTEM_ALERT` ou `NEW_REQUEST_AVAILABLE` |
| Nouveau devis | Client | `NEW_QUOTE_RECEIVED` |
| Devis accepté | Camionneur | `QUOTE_ACCEPTED` |
| Statut de mission | L’autre partie | `TRUCK_EN_ROUTE`, `DELIVERY_COMPLETED` ou `SYSTEM_ALERT` |
| Commande en attente, approuvée, refusée | Déjà en place en phase 2 | `SYSTEM_ALERT`, `PAYMENT_CONFIRMED` |
| Profil transporteur validé ou refusé | Transporteur | `PROFILE_VALIDATED`, `PROFILE_REJECTED` |

Aucun OTP n’est écrit dans ces messages ni dans les logs.
