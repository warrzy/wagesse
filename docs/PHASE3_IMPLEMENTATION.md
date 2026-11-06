# Implémentation — phase 3

Branche : `cursor/phase3-launch-readiness-ba0b`, issue de `cursor/manual-payment-guards-ba0b` (`8d813ae`).
Aucune migration. Aucun secret. PayDunya n’est pas appelé. `main` n’est pas modifié.

## SMS

`lib/sms.ts`

- `SMS_PROVIDER=simulate` ou `http`. Hors production, l’absence de variable vaut `simulate`. En production, elle vaut `http`.
- La simulation est refusée en production sauf `SMS_ALLOW_SIMULATE=true`.
- `http` envoie `POST` JSON `{ to, sender, message }` vers `SMS_HTTP_URL` avec `Authorization: Bearer SMS_HTTP_KEY`.
- Un numéro local à 8 chiffres est préfixé par `SMS_COUNTRY_CODE` (défaut `226`).
- L’expéditeur est `SMS_SENDER` (défaut `WAGESSE`).
- Le corps n’est jamais passé à `console`. En simulation autorisée, il reste en mémoire et se lit par `readSimulatedSms` (tests uniquement).
- URL ou clé absente, ou échec réseau : `{ delivered: false }` sans exception.

`lib/otp-delivery.ts` centralise l’émission. La limite de débit reste celle de `lib/auth.ts`, partagée entre vérification et réinitialisation, sur le numéro brut. La clé stockée est `phone` ou `reset:phone`.

Variables documentées dans `.env.example`. `docker-compose.yml` fixe `SMS_PROVIDER=simulate` pour le développement.

## Accès

- Inscription et renvoi appellent `issueOtp`. La réponse porte `data.smsDelivered`. L’écran `/auth/verify` affiche un avertissement si `sent=0`.
- `POST /api/auth/forgot-password` répond toujours le même message si le format du numéro est valide et que le compte est absent ou supprimé. Un compte réel trop sollicité répond 429.
- `POST /api/auth/reset-password` vérifie le code, impose 8 caractères, remet les tentatives à zéro, n’émet pas de jeton et ne débloque pas un compte `BLOCKED`.
- `/auth/forgot` enchaîne les deux étapes. Le lien est sur la page de connexion.
- La connexion refuse un compte inactif seulement après un mot de passe correct.

## Missions

`lib/mission-transitions.ts` reprend l’écran `/dashboard/missions/[id]` :

`ACCEPTED → TRUCK_EN_ROUTE_PICKUP → ARRIVED_PICKUP → LOADING_IN_PROGRESS → EN_ROUTE_DELIVERY → ARRIVED_DELIVERY → DELIVERED → PENDING_CONFIRMATION → COMPLETED`.

Les étapes de transport sont réservées au camionneur. `COMPLETED` est réservé au client. `CANCELLED` et `DISPUTED` restent ouverts aux deux là où le graphe les autorise. `REFUNDED` seulement depuis `DISPUTED`. Une transition refusée lève `Invalid transition`, mappée en 400.

L’acceptation d’un devis écrit `MissionStatusHistory` `ACCEPTED` dans la même transaction.

## Notifications et audit

`lib/notify.ts` écrit une notification dont le texte est coupé à 191 caractères. `notifyAdmins` vise les comptes `ADMIN` actifs.

`lib/audit.ts` écrit `AuditLog` lors du changement de rôle, de statut ou d’archivage d’un utilisateur, et lors de la vérification d’un transporteur. Les rôles acceptés sont `VISITOR`, `CLIENT`, `TRUCKER`, `OPERATOR`, `ADMIN`. Les statuts acceptés sont `ACTIVE`, `BLOCKED`, `SUSPENDED`, `DELETED`. Une valeur hors liste répond 400.

La fiche camionneur appelle la même API avec `VERIFIED` ou `REJECTED` et notifie le transporteur.

## Écrans

- Profils client et camionneur, liens depuis les tableaux de bord.
- Menu admin visible sous `lg` via le bouton Menu. Le bandeau large ne change pas.
- Lien Notifications dans la section Administration.
- Pages journal, notifications, paramètres et administrateurs, branchées sur des routes `GET` protégées par `getAuthContext`.

Les pages contenus, matériaux, promotions, rôles et types de camions restent des coquilles.

## Recherche

`search()` compare `pickupCity` et `dropoffCity` avec `contains`. MySQL `utf8mb4_unicode_ci` ignore déjà la casse. Aucun score `Match` n’est calculé.

## Ce qui n’a pas changé

Paiement manuel, garde-fous du bac à sable, masquage des contacts, verrou de portefeuille, idempotence des crédits, adaptateur PayDunya inactif, tarifs, design et schéma Prisma.
