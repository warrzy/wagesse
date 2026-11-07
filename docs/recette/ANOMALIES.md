# Fiches d'anomalies

## A1 — Majeure — L'interface s'arrête sur le code SMS

Reproduction : créer ou connecter un compte dont le téléphone n'est pas vérifié. L'API renvoie un jeton, puis le navigateur ouvre `/auth/verify`. En préproduction le SMS n'est pas délivré.

Cause : `app/auth/login/page.tsx` et `app/auth/signup/signup-client.tsx` imposent cet écran, alors que le message affiché réserve le code aux achats et aux contacts. Les routes payantes refusent déjà un numéro non vérifié.

Correctif : `destinationAfterAuthentication` envoie vers l'espace du rôle. Un bandeau rappelle la vérification. Test unitaire `tests/unit/auth-destination.test.ts` réussi. La préproduction déployée (`91e8235`) n'a pas reçu ce correctif : la capture `08-verification-sms.png` montre encore l'ancien écran.

## A2 — Majeure — Pages légales absentes

Reproduction : `/terms`, `/privacy`, `/legal/terms` et `/legal/privacy` répondent 404. Le pied de page et l'inscription pointent vers ces adresses.

Correctif : pages rédigées dans cette branche. Absentes du serveur tant que la branche n'est pas déployée.

## A3 — Mineure — 404 en anglais et sans habillage

Capture `04-404.png`. La page Next.js par défaut dit « This page could not be found. »

## A4 — Mineure — En-têtes de durcissement absents

`curl -I https://preprod.wagesse.fr/` ne montre ni HSTS, ni `X-Content-Type-Options`, ni `X-Frame-Options`. `x-powered-by: Next.js` est présent.

## A5 — Amélioration — Refus admin renvoyé en 401

Un client ou un transporteur qui appelle `/api/admin/dashboard` reçoit HTTP 401 et le texte Forbidden. Aucune donnée n'est renvoyée. Un code 403 serait plus exact.

## A6 — Critique npm, non exploitable sur cet hôte

`npm audit --omit=dev` signale une alerte critique Next.js : exécution de code à distance sur un serveur hébergé sous Windows. Le VPS est Ubuntu. Elle ne s'applique pas à cette préproduction. Onze alertes hautes restent ouvertes (axios, jsonwebtoken, prisma, sharp, zod, postcss, nanoid, follow-redirects, deepmerge-ts, source-map-js). Elles n'ont pas été mises à jour dans cette recette pour ne pas changer le framework déployé sans essai de non-régression.

## Non corrigé volontairement

Les écrans admin « en cours de construction », l'absence de notifications utilisateur et le rôle opérateur sans parcours propre sont des manques de produit, pas des régressions réparées ici.
