# Réactivation de la vérification SMS

La V1 commerciale fonctionne sans SMS. Le code OTP, les routes, le modèle `phoneVerified` et l'écran `/auth/verify` restent en place.

## Mode simple, valeur de lancement

`PHONE_VERIFICATION_REQUIRED=false`

- L'inscription et la connexion ouvrent le tableau de bord du rôle.
- `phoneVerified` reste vide tant qu'un code n'a pas été accepté.
- Les achats, forfaits, déblocages, devis et missions ne consultent pas ce champ.
- Les permissions, les soldes, la validation manuelle et l'interdiction d'une double attribution restent actifs.
- Un numéro non vérifié ne reçoit pas de code de réinitialisation. Le rétablissement passe par un administrateur, après un contrôle d'identité hors du numéro.

## Mode vérifié

`PHONE_VERIFICATION_REQUIRED=true`

Poser aussi `SMS_PROVIDER=http`, `SMS_HTTP_URL` et `SMS_HTTP_KEY` dans le fichier d'environnement root 600. Ne pas définir `SMS_ALLOW_SIMULATE` ni `OTP_DEBUG_RETURN`.

Si le drapeau vaut `true` sans fournisseur utilisable, l'inscription et les opérations qui exigeaient déjà un téléphone vérifié répondent HTTP 503 `PHONE_VERIFICATION_MISCONFIGURED`. Aucun compte n'est créé dans ce cas. `GET /api/auth/phone-verification` indique `misconfigured: true` sans exposer l'URL ni la clé.

Quand le fournisseur répond, le parcours reprend tel qu'il existait : code à six chiffres, dix minutes, cinq essais, limite d'envoi, et `phoneVerified` n'est écrit qu'après un code accepté. Les comptes déjà vérifiés le restent. Les comptes non vérifiés ne sont pas marqués vérifiés par le simple changement du drapeau.

## Interdit en production

`WAGESSE_DEPLOYMENT=preprod`, `PREPROD_TEST_PHONE_VERIFY=true` et la base `wagesse_preprod` n'ouvrent la vérification fictive que sur `preprod.wagesse.fr` ou la boucle locale. `node deploy/production/assert-env.mjs <fichier>` refuse ces valeurs et un mode SMS non déclaré. Il n'imprime pas les secrets.

## Contrôle avant réactivation

1. Envoyer un SMS d'essai vers un numéro de test, hors des journaux.
2. Vérifier qu'un compte non vérifié reçoit HTTP 403 `PHONE_NOT_VERIFIED` sur un achat.
3. Vérifier qu'un compte déjà vérifié n'a pas à recommencer.
4. Confirmer que le mécanisme fictif répond 404 sur le domaine de production.
