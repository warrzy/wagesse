# Résultats des tests — phase 3

Exécution réelle le 6 novembre 2026, de 19:10 à 19:29 (Europe/Paris), sur cette machine.

MariaDB 10.11.14 était déjà démarré sur `127.0.0.1:3306`. Docker n’est pas disponible. Aucune migration nouvelle : les 6 migrations de la phase 2 restent appliquées. Aucun `migrate reset`.

Bases :

- `wagesse_test` — tests d’intégration
- `wagesse_e2e` — seed de démonstration et Playwright (comptes `72000001`, `72100001`, `72200001`, mot de passe `password123`)

## Commandes et résultats

| Commande | Résultat |
| --- | --- |
| `npx tsc --noEmit --pretty false --incremental false` | code 0 |
| `npm run test:unit` | 12 tests, 12 réussites, 0 échec |
| `npm run test:integration` | 12 tests, 12 réussites, 0 échec |
| `npm run lint` | 0 erreur, 0 avertissement (relancé après les derniers correctifs) |
| `npm run build` | Next.js 16.2.12, compilation réussie, 85 pages |
| `npx playwright test` | 14 tests Chromium, 14 réussites, 0 échec |

Les 25 tests de la phase 2 sont inclus dans ces totaux : 7 unitaires, 8 d’intégration, 10 Playwright. La phase 3 en ajoute 5 unitaires, 4 d’intégration et 4 Playwright.

Variables d’intégration : `DATABASE_URL` vers `wagesse_test`, `JWT_SECRET=test-jwt-secret-phase2`, `PAYMENT_MODE=MANUAL`, `SMS_PROVIDER=simulate`, `OTP_DEBUG_RETURN=true`.

Playwright lance `next start` en production sur `127.0.0.1:3100` avec `DATABASE_URL` vers `wagesse_e2e`, `JWT_SECRET`, `PAYMENT_MODE=MANUAL`, `SMS_PROVIDER=simulate`, `SMS_ALLOW_SIMULATE=true`. Google Chrome du système sert de canal `chrome`.

Un premier passage Playwright a échoué sur trois nouveaux tests (navigation trop tôt après la connexion, texte `non` ambigu, numéro admin affiché deux fois). Les sélecteurs ont été corrigés. Le passage complet suivant a donné 14 réussites. Ces échecs intermédiaires ne sont pas comptés comme des réussites.

## Cas de la phase 3

Exécutés dans `tests/unit/phase3-access.test.ts` :

- Indicatif `226` sur un numéro local à 8 chiffres.
- Simulation SMS : le message est conservé en mémoire et n’apparaît pas dans `console.log`.
- Simulation refusée quand `NODE_ENV=production` sans `SMS_ALLOW_SIMULATE`.
- Fournisseur HTTP en échec réseau : `delivered` vaut faux.
- Transitions de mission : le camionneur avance vers `TRUCK_EN_ROUTE_PICKUP`, il ne clôture pas, le client confirme `COMPLETED`.

Exécutés dans `tests/integration/phase3-access.test.ts`, sur MariaDB :

- Un numéro inconnu et un compte existant reçoivent le même message de récupération. Seul le compte existant reçoit `debugOtp`, et seulement parce que `OTP_DEBUG_RETURN=true` hors production.
- La réinitialisation change le mot de passe. La connexion suivante réussit.
- Un compte `BLOCKED` avec le bon mot de passe reçoit 403 et aucun jeton.
- Un client qui appelle `GET /api/admin/logs` reçoit 401.
- Un camionneur qui passe une mission `ACCEPTED` à `COMPLETED` est refusé. Le passage à `TRUCK_EN_ROUTE_PICKUP` réussit et crée une notification pour le client.

Exécutés dans `tests/e2e/phase3.spec.ts` :

- `/auth/forgot` avec le numéro `60000000` affiche le message générique et le champ de code.
- Le client `72000001` enregistre son profil (ville Ouagadougou, secteur BTP) et voit « Profil enregistré ».
- L’administrateur ouvre le journal, les notifications et les paramètres. Le mode affiché est `MANUAL`, PayDunya est `non`, le compte `72200001` apparaît dans les administrateurs.
- À 390 px de large, le bouton Menu ouvre le lien Journal d’audit.

Les 10 tests Playwright de `tests/e2e/application.spec.ts` ont été rejoués dans le même passage : accueil, tarifs, connexions client, camionneur et admin, annonces, paiements, transports, refus d’accès client à `/admin`.

## Recette navigateur manuelle

Le 6 novembre 2026 vers 19:19–19:29 (Europe/Paris), sur `http://127.0.0.1:3100` :

- Mot de passe oublié : message « Si ce numéro a un compte, un code a été envoyé. »
- Profil client : « Profil enregistré ».
- Paramètres admin : `MANUAL`, PayDunya `non`, SMS `simulate`, aucune clé affichée.
- Journal d’audit et menu étroit : la page `/admin/logs` s’affiche, le bouton Menu est visible.

Le journal de la base de démonstration contenait déjà une ligne `approve_order` de la phase 2. Elle s’affiche. Ce n’est pas un secret.

## Non rejoué dans cette phase

Les scénarios de paiement manuel, de double attribution et de masquage des contacts restent couverts par `tests/integration/phase2-flow.test.ts`, rejoué dans le lot d’intégration (12/12). Aucun appel PayDunya réel. Aucun déploiement.
