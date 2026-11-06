# Plan de non-régression WAGESSE

Date : 6 novembre 2026 (Europe/Paris).
Référence code : commit `bf64432`.
Les scénarios marqués « existant » sont déjà dans `tests/e2e/application.spec.ts`. Ils doivent rester verts. Les autres sont à écrire avec le lot qui corrige le comportement. Un correctif n’est pas terminé tant que le scénario correspondant n’a pas été exécuté.

## Environnement

- Node 22 (`.nvmrc`).
- MySQL 8, base jetable, `npx prisma migrate deploy`, puis `npm run seed`.
- Comptes seed : client `72000001`, camionneur `72100001`, admin `72200001`, mot de passe `password123`.
- `JWT_SECRET` défini explicitement. `PAYMENT_MODE=MANUAL` pour les scénarios de lancement. `PAYMENT_PROVIDER=orange_money_sandbox` seulement pour les scénarios de développement.
- Playwright : le fichier actuel lance `next start` sur le port 3100. Il faut donc un build préalable et une base joignable par ce process. Le projet navigateur actuel est Chromium desktop. Ajouter un projet mobile (viewport étroit) pour l’admin et le checkout lorsque le menu mobile sera livré.
- Aucun test ne doit dépendre d’Orange Money, de PayDunya, de SMTP ou de S3.

## Déjà automatisé — à ne pas casser

| Id | Parcours | Attendu |
| --- | --- | --- |
| E2E-01 | `GET /` | HTTP 200, un titre visible, aucune erreur console, aucune requête en échec. |
| E2E-02 | Lien Tarifs depuis l’accueil | URL `/pricing`, `main` visible. |
| E2E-03 | Connexion client | Arrive sur `/dashboard/client`. |
| E2E-04 | Connexion camionneur | Arrive sur `/dashboard/trucker`. |
| E2E-05 | Connexion admin | Arrive sur `/admin`. |
| E2E-06 | Admin ouvre `/admin/annonces`, `/admin/paiements`, `/admin/transports` | HTTP 200, `main` visible, pas d’erreur console. |
| E2E-07 | Client ouvre `/admin` | Redirigé vers `/dashboard/client`, l’URL ne reste pas sur `/admin`. |

Ces tests ne couvrent pas les crédits, les devis, ni l’admin mobile. Les conserver tels quels et ajouter les cas ci-dessous.

## Authentification

| Id | Parcours | Attendu | Lot |
| --- | --- | --- | --- |
| AUTH-01 | Inscription client, téléphone inédit | Compte et `CustomerProfile` créés, JWT reçu, mot de passe non stocké en clair. | Existant à verrouiller par un test d’intégration. |
| AUTH-02 | Inscription avec le même téléphone | HTTP 409, un seul utilisateur. | Intégration. |
| AUTH-03 | Mauvais mot de passe | HTTP 401, message identifiants incorrects. | Intégration. |
| AUTH-04 | Compte `BLOCKED` avec un JWT encore valide | HTTP 401 sur une route métier. Aujourd’hui ce cas passe : c’est le comportement à faire évoluer, puis à figer. | Lot 0. |
| AUTH-05 | Cinq échecs de mot de passe | `lockedUntil` dans le futur, connexion refusée même avec le bon mot de passe. | Lot 3 si le verrouillage est livré. |
| AUTH-06 | Processus démarré sans `JWT_SECRET` | Le process ou la signature échoue. Pas de secret de repli. | Lot 0. |
| AUTH-07 | Logs d’inscription | Le code OTP n’apparaît pas. | Lot 0. |

## Demandes, offres, missions

| Id | Parcours | Attendu | Lot |
| --- | --- | --- | --- |
| REQ-01 | Client crée une demande et la publie | Statut `PUBLISHED`, `publishedAt` renseigné. | Intégration. |
| REQ-02 | Client modifie une demande publiée | Refus. Le brouillon reste éditable. | Intégration. |
| REQ-03 | Camionneur consulte la liste | Téléphone et e-mail du client masqués. | Lot 0. |
| REQ-04 | Client lit `GET /api/quotes?requestId=` avant déblocage | Pas de téléphone camionneur, pas de prix si le détail masque le prix. Le comportement du détail et celui de la liste doivent coïncider. | Lot 0. |
| REQ-05 | Camionneur dépose un second devis sur la même demande | Refus. | Intégration. |
| REQ-06 | Devis avec un véhicule d’un autre camionneur | Refus. | Intégration. |
| REQ-07 | Acceptation sans déblocage | Refus, aucune mission. | Intégration. |
| REQ-08 | Acceptation après déblocage | Une mission `ACCEPTED`, les autres devis `PENDING` passent à `REJECTED`, demande `ASSIGNED`. Rejouer l’acceptation ne crée pas une seconde mission. | Intégration. |
| REQ-09 | Texte de demande contenant un numéro ou un e-mail | Valeur stockée masquée par `sanitizeNoContactLeak`. | Unitaire. |
| MIS-01 | Passage de statut interdit (par exemple `ACCEPTED` vers `REFUNDED`) | Refus, statut inchangé, une fois le graphe livré. | Lot 3. |

## Crédits et déblocage

| Id | Parcours | Attendu | Lot |
| --- | --- | --- | --- |
| CR-01 | Dépense avec solde mensuel 3 et solde acheté 5, coût 4 | Mensuel à 0, acheté à 4, total 4. | Unitaire sur `spendCredit`. |
| CR-02 | Crédits mensuels dont la date d’expiration est passée | Ils ne comptent plus. Les crédits achetés restent. | Unitaire. |
| CR-03 | Solde insuffisant | HTTP 402, aucun `ContactUnlock`. | Intégration. |
| CR-04 | Deux déblocages concurrents du même couple demande / utilisateur | Un seul débit, une seule ligne `ContactUnlock`. | Intégration. |
| CR-05 | Second déblocage après succès | `alreadyUnlocked`, solde inchangé. | Intégration. |
| CR-06 | Ajustement admin sans motif | Refus. | Lot 1. |
| CR-07 | Ajustement admin avec motif | `ADMIN_ADJUSTMENT`, solde cohérent, ligne d’audit. | Lot 1. |

## Circuit manuel

À écrire avec le lot 1. Aucun de ces cas ne doit passer par l’écran PIN du bac à sable.

| Id | Parcours | Attendu |
| --- | --- | --- |
| MAN-01 | Liste publique des packs et des plans | Uniquement les lignes actives (et publiées, pour les plans). Un pack désactivé disparaît. L’ordre suit `sortOrder`. |
| MAN-02 | Confirmation d’un pack | Une commande `PENDING`. Snapshot égal au prix, aux crédits et au titre lus en base à cet instant. Portefeuille inchangé. |
| MAN-03 | Confirmation d’un forfait payant | Même règle. Abonnement non actif. |
| MAN-04 | Modification du prix du pack après la commande | La commande garde l’ancien montant. |
| MAN-05 | Admin notifié | Une `Notification` pour au moins un administrateur. |
| MAN-06 | Approbation | Crédits achetés augmentés du snapshot, ou forfait actif et crédits mensuels du snapshot. Statut `APPROVED`. Une `CreditTransaction`. Notification utilisateur. |
| MAN-07 | Seconde approbation de la même commande | HTTP idempotent, solde inchangé, une seule transaction de crédit. |
| MAN-08 | Refus avec motif | `REJECTED`, aucun crédit, aucun forfait. |
| MAN-09 | Utilisateur non admin appelle l’approbation | HTTP 401 ou 403. |
| MAN-10 | Deux approbations simultanées | Une seule attribution. |
| MAN-11 | Plan gratuit | Activable sans commande payante. Aucun crédit si `monthlyCredits` vaut 0. |
| MAN-12 | Historique utilisateur | La commande et, après approbation, le mouvement de crédits sont visibles. |

## Paiements provider

| Id | Parcours | Attendu | Lot |
| --- | --- | --- | --- |
| PAY-01 | `NODE_ENV=production` et provider bac à sable | `confirm` ne passe pas le paiement à un état qui crédite. Solde inchangé. | Lot 0. |
| PAY-02 | Développement, bac à sable | L’écran de confirmation reste utilisable pour les démos locales. | Lot 0. |
| PAY-03 | Webhook Orange avec `notif_token` incorrect | Pas d’attribution. | Intégration, déjà partiellement codé. |
| PAY-04 | Webhook Orange répété après succès | Un seul crédit. | Lot 0 / 1, à durcir. |
| PAY-05 | PayDunya, notification sans contre-vérification réussie | Pas d’attribution. | Lot 2. |
| PAY-06 | PayDunya, statut vérifié puis notification répétée | Un seul crédit. | Lot 2. |
| PAY-07 | `PAYMENT_MODE=MANUAL` | Le checkout n’ouvre pas PayDunya et n’affiche pas le PIN de simulation comme moyen d’obtenir des crédits. | Lot 1. |
| PAY-08 | Secrets | Aucune variable PayDunya dans le bundle client. Recherche dans `.next` et dans les réponses JSON. | Lot 2. |

## Back-office et habitudes à préserver

| Id | Parcours | Attendu |
| --- | --- | --- |
| ADM-01 | CRUD d’un pack jamais utilisé | Création, édition, désactivation. |
| ADM-02 | Suppression d’un pack déjà lié à un paiement | HTTP 409, pack conservé. |
| ADM-03 | Plan dépublié | Absent de `GET /api/subscription/plans` et de `/pricing`. |
| ADM-04 | Liste annonces, offres, transports, utilisateurs | Les filtres et la pagination déjà en place répondent encore. |
| ADM-05 | Largeur 390 px | Le menu admin permet d’atteindre la file des commandes, une fois le lot navigation livré. |
| ADM-06 | Journal | Une approbation et un refus produisent chacun une ligne consultable sur `/admin/logs`. |

## Sécurité transversale

- Un client ne lit pas le portefeuille d’un autre utilisateur.
- Un camionneur ne publie pas la demande d’un client.
- Les routes `app/api/admin/*` refusent un JWT client même si le garde React est contourné.
- `PATCH /api/admin/utilisateurs/[id]` refuse un rôle hors enum.
- Les réponses d’erreur ne contiennent pas de pile, de secret ni d’OTP.

## Commandes de clôture

À lancer sur une base seedée, dans cet ordre, et à coller le résultat dans la description du lot :

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Les tests d’intégration nouveaux s’exécutent avant Playwright s’ils sont ajoutés au script. Tant qu’ils n’existent pas, le lot qui les introduit les ajoute au `package.json` sans retirer `test:e2e`.

## Ce que cet audit n’a pas exécuté

Le 6 novembre 2026, les dépendances n’étaient pas installées et MySQL n’était pas disponible. Aucun des cas ci-dessus n’a été rejoué pendant la rédaction de ce plan. La première consolidation devra produire la sortie réelle de lint, types, build et Playwright, y compris E2E-01 à E2E-07, avant d’annoncer un parcours comme vérifié.
