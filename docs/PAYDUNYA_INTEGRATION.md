# Préparation PayDunya

PayDunya n’est pas activé. Aucune clé n’est versionnée. Les tests n’appellent pas l’API PayDunya : ils simulent `fetch` ou évaluent le hash localement.

## Variables

À renseigner seulement au moment de l’activation, jamais dans le dépôt.

| Variable | Rôle |
| --- | --- |
| `PAYMENT_MODE` | `MANUAL` (lancement), `PAYDUNYA` (plus tard), `PROVIDER` (Orange existant) |
| `PAYDUNYA_ENABLED` | Doit valoir `true` pour que le mode `PAYDUNYA` reste actif quand `NODE_ENV=production` |
| `PAYDUNYA_MASTER_KEY` | Clé maître. Sert au hash SHA-512 |
| `PAYDUNYA_PRIVATE_KEY` | Clé privée d’appel API |
| `PAYDUNYA_TOKEN` | Jeton d’appel API |
| `PAYDUNYA_MODE` | `test` ou `live`. Défaut `test` |
| `PAYDUNYA_STORE_NAME` | Nom affiché sur la facture |
| `PAYDUNYA_CALLBACK_URL` | URL de notification, sinon l’origine de l’application + `/api/payments/paydunya/webhook` |

`.env.example` laisse ces valeurs vides, avec `PAYMENT_MODE=MANUAL`.

## Comportement

`lib/paydunya.ts` implémente `PayDunyaProvider` sur le même contrat que le fournisseur existant (`charge`, `verify`).

- Création : `POST https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create` en mode `test`, ou `https://app.paydunya.com/api/v1/checkout-invoice/create` en mode `live`. Succès attendu : `response_code` `00`, un jeton, et l’URL de paiement dans `response_text`.
- Confirmation : `GET …/checkout-invoice/confirm/{token}`.
- L’attribution n’a lieu que si le hash reçu est le SHA-512 hexadécimal de la clé maître seule, le statut est `completed`, et le montant égale le montant attendu. La comparaison de hash utilise `timingSafeEqual` lorsque les longueurs correspondent.
- `POST /api/payments/paydunya/webhook` refuse un hash invalide (`401`). Un hash valide ne crédite pas tout seul : `finalizePaydunya` relit l’endpoint de confirmation.
- `GET /api/payments/paydunya/return/[paymentId]` repasse aussi par cette confirmation.
- `confirm()` refuse un paiement dont le fournisseur est `paydunya` s’il est appelé comme une confirmation sandbox.
- Sans clés, ou en production sans `PAYDUNYA_ENABLED=true`, la création échoue de façon fermée (`PAYDUNYA_DISABLED`). Aucun chemin simulé ne marque un paiement réussi.

Le mode `PROVIDER` conserve Orange Money. Le bac à sable de ce fournisseur ne peut plus attribuer de crédits en production.
