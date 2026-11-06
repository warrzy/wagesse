# Résultats des tests — phase 2

Exécution réelle le 6 novembre 2026, entre 18:45 et 18:58 UTC (19:45–19:58, Europe/Paris), sur cette machine.

Docker n’est pas disponible. MariaDB 10.11.14 a été installé et démarré localement (`mariadbd` sur `127.0.0.1:3306`). Deux bases distinctes :

- `wagesse_test` — tests d’intégration (`mysql://wagesse_test@127.0.0.1:3306/wagesse_test`)
- `wagesse_e2e` — seed de démonstration et Playwright

`npx prisma migrate deploy` a appliqué les 6 migrations sur les deux bases, après correction de la casse des noms de tables dans les migrations historiques.

## Commandes et résultats

| Commande | Résultat |
| --- | --- |
| `npm ci` | 464 paquets installés, code de sortie 0 |
| `npx prisma generate` | Client Prisma 6.19.3 généré |
| `npx prisma migrate deploy` | 6 migrations appliquées sur `wagesse_test`, puis sur `wagesse_e2e` |
| `npm run test:unit` | 7 tests, 7 réussites, 0 échec |
| `npm run test:integration` | 8 tests, 8 réussites, 0 échec |
| `npm run lint` | 0 erreur, 0 avertissement (relancé après les derniers correctifs) |
| `npm run typecheck` | `tsc --noEmit` code 0 |
| `npm run build` | Next.js 16.2.12, compilation réussie, 77 pages |
| `npm run seed` sur `wagesse_e2e` | Comptes 72000001, 72100001, 72200001 créés |
| `npx playwright test` | 10 tests Chromium, 10 réussites, 0 échec |

Variables d’intégration : `DATABASE_URL` vers `wagesse_test`, `JWT_SECRET=test-jwt-secret-phase2`, `PAYMENT_MODE=MANUAL`, `PAYMENT_PROVIDER=orange_money_sandbox`.

Playwright lance `next start` en production sur `127.0.0.1:3100` avec `JWT_SECRET` et `DATABASE_URL` vers `wagesse_e2e`. FFmpeg Playwright a été téléchargé pour l’enregistrement vidéo prévu par la config. Google Chrome du système a servi de canal `chrome`.

## Cas demandés

Tous ont été exécutés dans `tests/integration/phase2-flow.test.ts`, sauf mention.

- Fuite de contacts : un camionneur qui parcourt les demandes ne reçoit pas le téléphone du client. La liste des devis, sans déblocage, ne contient ni téléphone ni prix.
- Activation directe : `POST /api/subscription/activate` sur un forfait à 5 000 XOF répond 403 et ne crée pas d’abonnement `ACTIVE`.
- Bac à sable : en `NODE_ENV=production`, `confirm()` d’un paiement `metadata.sandbox` lève `SANDBOX_DISABLED`. Le paiement ne devient pas `SUCCESSFUL`. Le portefeuille reste absent.
- Double attribution : deux approbations simultanées de la même commande laissent un seul mouvement `PURCHASE` et `purchasedBalance = 5`. Une troisième approbation renvoie `alreadyProcessed`.
- Approbation concurrente : couverte par le même scénario (`alreadyProcessed` sur l’un des deux appels).
- Compte bloqué : `GET /api/credits/balance` avec un JWT valide d’un utilisateur `BLOCKED` répond 401.
- Débit concurrent : deux `consumeCreditForUnlock` simultanés laissent un seul `ContactUnlock` et un solde acheté de 1 sur 2. Le second insert échoue sur la contrainte unique et la transaction est annulée. Prisma journalise cette erreur attendue.
- Circuit manuel : achat d’un pack à 4 000 XOF / 5 crédits, portefeuille vide tant que la commande est `PENDING`, snapshot inchangé après modification du pack (99 999 / 99), notification admin contenant la référence, puis approbation. Un refus séparé laisse le portefeuille vide et le statut `REJECTED`.

Tests unitaires : politique sandbox, prix payant, repli PayDunya en production, hash et montant, `verify()` qui échoue si le réseau jette, verrouillage OTP au 5e essai, absence du code OTP en production.

## Vérification navigateur du circuit manuel

Sur l’application construite (`next start`, base `wagesse_e2e`, compte client `72000001`) :

1. `/pricing/checkout?pack=PACK_DECOUVERTE` affiche « Règlement hors plateforme » et « Confirmer la demande ».
2. La confirmation crée `CMD-MW5A1OYNY1SE87`, statut `PENDING`, 1 000 XOF, 1 crédit, instructions visibles. Aucun crédit avant approbation.
3. Le compte admin `72200001` voit la commande dans `/admin/commandes` et l’approuve.
4. La base confirme ensuite `status=APPROVED`, événements `CREATED` et `APPROVED`, `purchasedBalance=1`, `subscriptionBalance=0`, `balance=1`.

Les écrans d’administration vides et le viewport mobile du menu admin n’ont pas été reconstruits. Le plan de régression demandait un projet Playwright mobile seulement lorsque ce menu serait livré.

## Risques résiduels

- Pas de SMS : un nouvel utilisateur en production ne peut pas recevoir son OTP. Les comptes seed restent utilisables.
- PayDunya n’a pas été appelé sur le réseau PayDunya. Le contrôle de hash et le refus d’un succès simulé sont couverts. Le contrat HTTP réel reste à valider avec de vraies clés de test, hors de ce dépôt.
- Les checksums Prisma des migrations `20260731002419`, `20260802013334`, `20260807141014` et `20260808110727` ont changé à cause de la casse des tables. Une base qui les aurait déjà appliquées avec les anciens fichiers devra être réconciliée (`prisma migrate resolve`) avant `migrate deploy`. Les bases de test de cette session ont été créées vides.
- `next start` en production exige `JWT_SECRET`. Sans cette variable, la connexion lève une erreur au lieu d’utiliser le secret de développement.
