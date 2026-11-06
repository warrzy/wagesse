# Circuit de paiement manuel

Mode par défaut : `PAYMENT_MODE=MANUAL`.

Les instructions affichées viennent de `MANUAL_PAYMENT_INSTRUCTIONS`. Si la variable est vide, un texte français sans coordonnées bancaires est utilisé. Le texte est copié sur la commande au moment de la création et ne change plus ensuite.

## Parcours utilisateur

1. L’utilisateur choisit un pack actif sur `/pricing` ou un forfait payant publié. Le checkout est `/pricing/checkout?pack=CODE` ou `/pricing/subscription-checkout?plan=CODE`.
2. `POST /api/credits/purchase` ou `POST /api/subscription/purchase` crée une `CommercialOrder` au statut `PENDING`.
3. La référence est unique (`CMD-…`). Le code, le titre, le montant XOF, les crédits, les boosts, le cycle et les bénéfices sont copiés depuis la ligne catalogue.
4. Une notification `SYSTEM_ALERT` part vers l’utilisateur et vers chaque administrateur `ACTIVE`.
5. L’utilisateur est redirigé vers `/dashboard/commandes/[id]`, qui affiche la référence, le statut `PENDING` et les instructions. Aucun portefeuille ni abonnement n’est créé à cette étape.
6. Une modification ultérieure du pack ou du forfait ne modifie pas la commande déjà enregistrée.

Un forfait à prix nul n’ouvre pas de commande : `PLAN_NOT_PAID`. Un pack inactif ou à montant nul est refusé.

Le téléphone doit être vérifié. Un compte bloqué, suspendu ou supprimé est rejeté avant la création.

## Parcours administrateur

`/admin/commandes` liste les commandes, avec filtre de statut (`PENDING`, `APPROVED`, `REJECTED`), de type (`CREDIT_PACK`, `SUBSCRIPTION`) et de recherche. Une valeur de filtre inconnue est ignorée.

Sur `/admin/commandes/[id]` :

- Approuver appelle `POST /api/admin/commandes/[id]/approve`.
- Refuser appelle `POST /api/admin/commandes/[id]/reject` et exige un motif d’au moins 3 caractères.

## Transaction d’approbation

1. La commande doit être `PENDING`.
2. `updateMany` ne met à jour que si le statut est encore `PENDING`. Un second appel, y compris simultané, obtient `alreadyProcessed` et n’attribue rien.
3. Pack : `grantPurchasedCredits` avec la clé `order:{id}` augmente `purchasedBalance`.
4. Forfait : `activateOrRenewSubscription` utilise le même verrou de transaction, les crédits et la durée figés, même si le plan a été archivé ensuite (`requireActivePlan: false`).
5. Un `Payment` `providerName=manual`, `status=SUCCESSFUL`, référence identique à la commande, est écrit dans la même transaction.
6. Un événement `APPROVED` ou `REJECTED`, une ligne `AuditLog`, et une notification utilisateur (`PAYMENT_CONFIRMED` en cas d’accord) sont enregistrés.

Un refus ne crée ni crédit, ni abonnement, ni paiement.

Les crédits mensuels d’un forfait et les crédits achetés d’un pack restent distingués : le pack n’alimente que `purchasedBalance`.
