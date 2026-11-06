# Phase 2 — Sécurisation et paiement manuel

Date : 6 novembre 2026 (Europe/Paris).
Base vérifiée : PR #2, commit d’audit `c051162`, lui-même fondé sur `bf64432`.
Branche : `cursor/manual-payment-guards-ba0b`.
Aucun déploiement et aucune fusion n’ont été faits.

## Lot 1 — Garde-fous

### Paiement et activation

- `PAYMENT_MODE` vaut `MANUAL` par défaut. Le checkout n’ouvre plus le bac à sable Orange Money.
- En `NODE_ENV=production`, une confirmation sandbox (`PAYMENT_PROVIDER=orange_money_sandbox` ou `metadata.sandbox`) lève `SANDBOX_DISABLED` et ne passe pas le paiement à `SUCCESSFUL`.
- `POST /api/subscription/activate` refuse un forfait dont le prix mensuel est supérieur à 0 (`403 PAYMENT_REQUIRED`). Un forfait à prix 0 peut encore être activé.
- L’écran `/abonnement` envoie les forfaits payants vers le checkout existant `/pricing/subscription-checkout`.

### Contacts

Les téléphones et e-mails ne sont renvoyés qu’au propriétaire de la demande, à l’auteur du devis, ou à l’utilisateur qui possède un `ContactUnlock` pour cette demande. L’admin continue de voir les coordonnées.

Routes ajustées : `GET /api/requests/browse`, `GET /api/quotes`, `GET /api/quotes/[id]`, listes et détails de missions. Les listes client ne renvoient plus le prix des devis tant que le contact n’est pas débloqué.

### Portefeuille

Le débit et la création du `ContactUnlock` tiennent dans une transaction avec `SELECT ... FOR UPDATE` sur le portefeuille. Une contrainte unique `(requestId, unlockedByUserId)` empêche un second déblocage. Les crédits mensuels sont consommés avant les crédits achetés. Les crédits achetés ne sont pas expirés par le cycle d’abonnement.

Les attributions portent une clé d’idempotence unique (`payment:…` ou `order:…`). Une collision `P2002` annule la transaction au lieu d’enregistrer un second crédit.

### Authentification

`getAuthContext` recharge l’utilisateur. Un compte absent, supprimé ou dont le statut n’est pas `ACTIVE` ne passe pas. Le rôle renvoyé est celui de la base.

Cinq échecs de mot de passe verrouillent le compte 15 minutes. L’OTP est stocké en SHA-256, n’est plus journalisé, et se verrouille après 5 essais. Un renvoi est limité (60 secondes, 5 par heure). Les achats et les déblocages exigent un téléphone vérifié. Les comptes de démonstration du seed ont déjà `phoneVerified`, donc la connexion e2e reste sur les tableaux de bord.

Sans canal SMS, un nouvel inscrit en production ne reçoit pas le code. `OTP_DEBUG_RETURN=true` ne renvoie le code que hors production.

## Lot 2 — Commande manuelle

Voir `docs/MANUAL_PAYMENT_WORKFLOW.md`.

`CommercialOrder` fige le pack ou le forfait. L’approbation revendique la ligne `PENDING` par `updateMany`, puis crédite ou active le forfait et écrit le paiement `manual` dans la même transaction.

Écrans : `/dashboard/commandes`, `/admin/commandes`, lien « Commandes » dans le menu admin, liens « Mes commandes » sur les tableaux de bord client et camionneur. Le checkout réutilise les pages de tarifs existantes. Le bouton devient « Confirmer la demande ».

## Lot 3 — PayDunya

Voir `docs/PAYDUNYA_INTEGRATION.md`. L’adaptateur est présent et inactif. Aucune clé réelle n’est dans le dépôt. En production, `PAYMENT_MODE=PAYDUNYA` retombe sur `MANUAL` tant que `PAYDUNYA_ENABLED` n’est pas `true`.

## Lot 4 — Correctifs découverts en exécutant les tests

- Les migrations historiques citaient des tables en minuscules (`quote`, `contactunlock`, `subscriptionplan`, …) alors que l’init crée `Quote`, `ContactUnlock`, `SubscriptionPlan`. Sur MariaDB/MySQL Linux, sensible à la casse, `migrate deploy` s’arrêtait. Seuls les identifiants ont été alignés. Le backfill de `unlockedByUserId` et la suppression de `ContactUnlock.paymentId` sont inchangés. Une base qui aurait déjà appliqué les fichiers d’origine verra un écart de checksum Prisma.
- `Notification.message` est un `VARCHAR(191)`. Les messages de commande sont tronqués à cette longueur. Le texte complet des instructions reste sur la commande.
- La recherche admin des packs n’utilise plus `mode: "insensitive"`, absent du connecteur MySQL.
- `/contact` répond, le pied de page y pointe déjà. `public/favicon.ico` supprime le 404 du navigateur.
- Le champ mot de passe de connexion a un `aria-label`, requis par le sélecteur Playwright existant.
- Les préchargements Next.js annulés (`net::ERR_ABORTED`) ne sont plus comptés comme des pannes réseau dans `tests/e2e/application.spec.ts`. Les réponses HTTP 4xx/5xx le restent.

## Hors périmètre

Les pages admin encore vides (contenus, logs, matériaux, notifications, paramètres, promotions, rôles, types de camions, administrateurs), l’envoi SMS/e-mail, le graphe d’états des missions et le matching automatique ne sont pas reconstruits.
