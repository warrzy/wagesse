# Feuille de route WAGESSE

Date : 6 novembre 2026 (Europe/Paris).
Base : audit du commit `bf64432`, documents `docs/AUDIT_WAGESSE.md` et `docs/FUNCTIONAL_MATRIX.md`.

Cette feuille de route décrit le travail restant. Elle ne le réalise pas. Aucune bascule de schéma ni aucun changement de parcours n’accompagne ce document.

Principe : chaque lot réutilise les services existants, ajoute une migration neuve si le schéma change, et se termine par les tests du plan de non-régression. On ne réécrit pas la marketplace.

## Ordre retenu

Le lancement commercial dépend du circuit manuel et de l’interdiction d’attribuer des crédits sans preuve de règlement. Les correctifs de sécurité qui permettent de contourner ce règlement passent en même temps, sinon le circuit manuel est inutile.

1. Garde-fous P0 qui empêchent une attribution non prouvée.
2. Circuit commercial manuel.
3. Adaptateur PayDunya inactif par défaut.
4. Consolidation des parcours déjà codés.
5. Préparation d’exploitation, sans mise en production.

## Lot 0 — Garde-fous avant toute attribution

Objectif : un environnement de production ne peut plus créditer un portefeuille ou activer un forfait sans décision explicite.

Corrections ciblées :

- Dans `applySideEffects`, ne pas créditer ni activer si le provider est le bac à sable Orange Money lorsque `NODE_ENV=production`. Le bac à sable reste utilisable en développement et doit être couvert par un test qui prouve l’absence d’écriture en production.
- `POST /api/subscription/activate` : ne plus activer un plan payant. Le plan `FREE` à prix nul peut rester activable sans paiement, parce que `subscription/purchase` refuse déjà un montant nul. Un plan dont `monthlyPrice > 0` passe uniquement par le circuit de commande.
- Masquer téléphone et e-mail dans `requestService.search`.
- Masquer les devis tant que `ContactUnlock` n’existe pas, y compris sur `GET /api/quotes?requestId=`.
- `getAuthContext` : charger l’utilisateur et refuser `BLOCKED`, `SUSPENDED`, `DELETED`.
- Refuser de signer un JWT si `JWT_SECRET` est absent. Supprimer la valeur de repli.
- Cesser de journaliser le code OTP.

Fichiers principalement concernés : `lib/services/payment-service.ts`, `lib/payment-provider.ts`, `app/api/subscription/activate/route.ts`, `lib/services/request-service.ts`, `app/api/quotes/route.ts`, `lib/api-auth.ts`, `lib/auth.ts`, `app/api/auth/signup/route.ts`.

Risque : les tests e2e de connexion et les achats de démo en local doivent continuer à fonctionner. Le seed et l’écran `/payments/[id]/confirm` restent en développement.

Hors périmètre : ne pas retirer Orange Money, ne pas changer le design des pages de tarifs.

## Lot 1 — Circuit commercial manuel

Objectif : vendre packs et forfaits sans API de paiement, avec une seule attribution après approbation.

### Modèle

Nouvelle migration additive. Ne pas modifier les migrations déjà appliquées.

Table de commande, nommée dans le code de façon explicite (par exemple `CommercialOrder`), distincte de `Payment` :

- demandeur : `userId` ;
- type : `CREDIT_PACK` ou `SUBSCRIPTION` ;
- références : code pack ou code plan ;
- snapshot figé : titre, montant XOF, devise, nombre de crédits, boosts, avantages, badge, coût de déblocage, durée de cycle ;
- statut : `PENDING`, `APPROVED`, `REJECTED` ;
- motif de décision, administrateur, horodatage de décision ;
- clé d’idempotence unique par commande.

Le prix et les avantages sont copiés au moment de la confirmation de la demande. Une modification ultérieure du pack ou du plan ne change pas la commande en attente.

`Payment` actuel continue de servir le mode provider. Le mode manuel n’y inscrit un paiement `SUCCESSFUL` qu’au moment de l’approbation, ou n’utilise que la commande : le choix d’implémentation doit réutiliser `applySideEffects` pour que les règles de crédits ne divergent pas. Une seule fonction attribue les droits.

### Parcours utilisateur

1. `/pricing` continue d’afficher les offres publiées en base.
2. Le checkout existant propose le règlement manuel lorsque `PAYMENT_MODE=MANUAL`.
3. La confirmation crée une commande `PENDING`. Elle ne crédite rien.
4. L’utilisateur voit la demande dans son historique, à côté des mouvements de crédits déjà prévus par `CreditTransaction`.

### Back-office

Section nouvelle dans la navigation Finance, sans retirer Transactions, Paiements, Wallet, Abonnements, Tarifs :

- liste filtrable des demandes (statut, type, période, texte sur nom, téléphone, référence) ;
- fiche : snapshot, montant, crédits, avantages, coordonnées du demandeur ;
- historique de traitement (création, approbation, refus) ;
- approuver ou refuser, motif obligatoire au refus ;
- ajustement manuel de crédits sur la fiche wallet déjà esquissée, avec justification obligatoire, type `ADMIN_ADJUSTMENT`.

### Règles d’attribution

- Transaction Prisma unique.
- Verrou de la commande (`UPDATE … WHERE status = PENDING`). Si zéro ligne, l’appel est ignoré.
- Contrôle d’idempotence déjà présent pour `PURCHASE` (métadonnée `paymentId` ou identifiant de commande) déplacé dans la même transaction. Ajouter une contrainte d’unicité exploitable, pas seulement un `findFirst`.
- Pour l’abonnement, l’idempotence est portée par l’identifiant de commande, pas par un nouvel horodatage de cycle. `activateOrRenewSubscription` ne doit pas réémettre un cycle si cette commande a déjà été appliquée.
- Après commit : notification in-app à l’utilisateur (`PAYMENT_CONFIRMED` existe déjà dans l’enum).
- À la création : notification in-app aux administrateurs.
- Écriture `AuditLog` : acteur, action, ressource, avant/après. La page `/admin/logs` affiche ces lignes au lieu du texte « en construction ».

### Déblocage de contact

Même transaction pour `spendCredit` et `ContactUnlock`. En cas de conflit d’unicité, ne pas laisser un second débit. Cette correction protège le parcours actuel, elle ne change pas le prix ni l’écran.

### Mode

`PAYMENT_MODE=MANUAL` est le défaut du lancement. `orange_money_sandbox` ne déclenche plus d’attribution en production. Aucun bouton de démonstration ne crédite un portefeuille réel.

### Hors périmètre de ce lot

PayDunya, matching, SMS, upload de documents, refonte visuelle, boosts, commissions de mission.

## Lot 2 — PayDunya, prêt et inactif

Objectif : brancher le fournisseur sans clés de production et sans l’activer.

S’appuyer sur `PaymentProvider` :

- classe `PayDunyaProvider` : créer une facture, interroger le statut, vérifier la notification ;
- enregistrement dans `PaymentProviderFactory` ;
- variables serveur uniquement : `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_TOKEN`, `PAYDUNYA_MODE` (`test` ou `live`), URL de callback. Documentées dans `.env.example` avec des valeurs vides ;
- aucun de ces noms préfixé `NEXT_PUBLIC_` ;
- création d’un `Payment` via `paymentServiceLayer.initialize` ;
- callback et IPN : revérifier le statut auprès de PayDunya avant `applySideEffects`. Rejouer la même notification ne crédite qu’une fois ;
- persister l’événement dans `PaymentWebhook` ;
- tests simulés qui injectent une charge utile et prouvent le refus si la contre-vérification échoue, et l’absence de second crédit ;
- sélecteur de mode : `MANUAL` ou `PAYDUNYA`. Le bac à sable Orange reste un troisième provider de développement, jamais le mode de lancement.

Le mode `MANUAL` reste celui qui est activé. Passer à `PAYDUNYA` est un changement d’environnement, pas un changement de code au moment où les clés arriveront.

Ne pas journaliser les clés, les tokens de notification ni les corps bruts contenant un secret.

## Lot 3 — Consolidation des parcours existants

Dans l’ordre des dommages :

1. Fuites de contacts et session (lot 0), si elles ne sont pas déjà mergées.
2. Transitions de mission : table minimale des passages autorisés. Les statuts déjà en base restent valides. Interdire les sauts vers `REFUNDED` ou `COMPLETED` sans passage par un état livré.
3. Historique de statut écrit à la création de la mission.
4. Écriture d’historique quand les crédits mensuels expirent.
5. `GET /api/credits/packs` : plus de prix de repli codés en dur. Liste vide si la base est vide.
6. Validation du rôle admin contre l’enum Prisma. Retirer `SUPER_ADMIN` de l’UI tant qu’il n’est pas migré.
7. Aligner le contrôle de `subscription-plans` sur les autres routes admin.
8. Mot de passe admin : même minimum que l’inscription (8).
9. Navigation admin utilisable sous la largeur `lg` (replier le menu, ne pas le supprimer).
10. Recherche globale : la brancher sur les listes existantes ou retirer le champ tant qu’il ne cherche rien.
11. Vérification camionneur : brancher le bouton existant sur `verificationStatus`, avec audit. Ne pas exiger la vérification pour déposer un devis tant que le métier ne l’a pas décidé ; le documenter dans la fiche.
12. Pages coquilles restantes : les laisser, avec leur libellé, plutôt que de simuler des données.

Preuves exigées avant de clore le lot : `npm run lint`, `npm run typecheck`, `npm run build`, Playwright existant plus les nouveaux cas du plan de non-régression. MySQL du `docker-compose.yml`, migrations par `prisma migrate deploy`, seed de démonstration.

## Lot 4 — Préparation à l’exploitation

Sans déployer.

- Document d’exploitation : version Node 22, `npm ci`, `prisma migrate deploy`, variables obligatoires, santé HTTP.
- Vérifier que le Dockerfile de production contient le client Prisma généré et que le process ne démarre pas si `DATABASE_URL` ou `JWT_SECRET` manquent.
- Checklist HTTPS, domaine, sauvegarde MySQL et restauration testée, rétention des logs, alerte si une attribution échoue après approbation.
- E-mails : interface d’envoi derrière les notifications déjà écrites en base. L’envoi réel attend un compte SMTP. L’absence de SMTP ne doit pas annuler l’attribution (la notification in-app reste la source de vérité).
- Protection admin : rôle relu en base, pas seulement le garde React.
- Procédure de retour arrière : redeployer l’image précédente. Les migrations additives ne se descendent pas en production. Un correctif de données passe par un script relu, jamais par `migrate reset`.
- Interdire dans la procédure : `prisma migrate reset`, `git push --force`, restauration par-dessus une base sans sauvegarde datée.

Le déploiement effectif attend la validation des tests et la remise des accès (base, domaine, SMTP, et plus tard PayDunya).

## Explicitement différé

Matching par score, boosts, plafonds de plan, notations, litiges, messagerie, factures, commissions, reversements, upload S3, SMS, WhatsApp, 2FA, organisations, materials admin, promotions. Les modèles restent en place.

## Critère de sortie

Une version est exploitable commercialement lorsque :

- `PAYMENT_MODE=MANUAL` ;
- une commande en attente n’ajoute aucun crédit et n’active aucun forfait ;
- l’approbation les attribue une seule fois, y compris si l’administrateur valide deux fois ;
- le refus n’attribue rien ;
- un ajustement manuel exige un motif et laisse une ligne d’audit ;
- les contacts restent masqués tant que le crédit n’est pas dépensé ;
- un compte bloqué ne passe plus les API avec un ancien JWT ;
- PayDunya est présent, couvert par des tests simulés, et désactivé ;
- lint, types, build et les tests de non-régression passent sur MySQL.
