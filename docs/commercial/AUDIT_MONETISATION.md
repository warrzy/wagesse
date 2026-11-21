# Audit du modèle commercial

Le portefeuille `CreditWallet`, les commandes `CommercialOrder`, les packs `CreditPack` et les forfaits `SubscriptionPlan` sont conservés. Aucun second portefeuille n’a été ajouté.

## Schéma utilisé

- `CreditWallet` : solde acheté, solde d’abonnement, expiration.
- `CreditTransaction` : achat, déblocage historique, rechargement, ajustement, promotion, et désormais `QUOTE_SUBMISSION`.
- `CommercialOrder` : commande figée, statuts `PENDING`, `APPROVED`, `REJECTED`.
- `CommercialOrderEvent` : création, approbation, refus, instructions envoyées, référence de paiement, note interne.
- `ContactUnlock` : historique. Les nouveaux parcours ne l’utilisent plus pour facturer.

## Matrice

| Fonctionnalité | Comportement précédent | Comportement attendu | Écart | Modification | Risque |
| --- | --- | --- | --- | --- | --- |
| Publication client | Gratuite | Gratuite | Aucun | Aucune | Faible |
| Consultation des devis par le client | Prix et identité masqués jusqu’au paiement d’un crédit | Consultation intégrale, numéro après acceptation | Le client payait pour lire un devis | `unlock-contacts` ne débite plus. Les devis sont renvoyés complets, téléphone masqué | Un ancien écran qui attendait `locked: true` affiche maintenant le devis |
| Acceptation d’un devis | Exigeait un déblocage payant | Gratuite pour le client | Le refus bloquait la mission | `quoteService.accept` ne consulte plus `ContactUnlock` | Les missions existantes ne sont pas recréées |
| Achat par un client | Autorisé | Interdit | L’API acceptait tout rôle | Refus `TRUCKER_PURCHASE_ONLY` après le contrôle de téléphone | Les commandes client déjà créées restent consultables |
| Envoi d’un devis | Gratuit | Débite des crédits | Le débit portait sur le contact, pas sur le devis | Débit atomique `QUOTE_SUBMISSION` | Un transporteur sans crédit ne peut plus répondre |
| Déblocage du contact transporteur | 1 crédit, ou le coût du forfait | Inclus dans le devis déjà payé, révélé à l’acceptation | Double facturation possible | L’API ne débite plus et refuse le numéro avant acceptation | Les contacts déjà débloqués restent dans l’historique |
| Approbation | `ADMIN` ou `SUPER_ADMIN` | Super administrateur seul | Un admin pouvait créditer | Les routes d’approbation, de refus et d’ajustement exigent `SUPER_ADMIN` | Un admin opérationnel ne peut plus valider un règlement |
| Double approbation | Déjà protégée par statut et clé d’idempotence | Inchangé | Aucun | Conservé | Faible |
| Prix de la commande | Figé depuis le catalogue | Inchangé | Aucun | Conservé | Faible |
| Forfait gratuit | Refusé par l’API payante, mais le bouton menait vers l’abonnement | Identifié comme gratuit | Parcours ambigu | Le bouton gratuit va vers l’inscription transporteur | Faible |
| Coût du devis | Implicite, 1 crédit de déblocage | Administrable | Pas de réglage dédié | `PlatformSetting` `trucker.quoteCreditCost`, défaut 1 | Changer le coût n’affecte pas les devis déjà envoyés |
| Remboursement | Non défini | Pas de remboursement automatique | À documenter avant code | Documenté dans `POLITIQUE_CREDITS.md` | Un retrait de devis ne rend pas le crédit |

## Permissions

| Action | Client | Transporteur | Admin | Super admin |
| --- | --- | --- | --- | --- |
| Publier une demande | Oui | Non | Non | Non |
| Lire un devis reçu | Oui, téléphone après acceptation | Ses devis | Oui | Oui |
| Acheter un pack ou un forfait | Non | Oui | Non | Non |
| Envoyer un devis | Non | Oui, si le solde suffit | Non | Non |
| Approuver ou refuser une commande | Non | Non | Non | Oui |
| Ajuster un portefeuille | Non | Non | Non | Oui |
| Lire les commandes en attente | Les siennes | Les siennes | Oui | Oui |
