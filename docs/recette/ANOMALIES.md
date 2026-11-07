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

Correctif dans cette branche : `app/not-found.tsx` affiche une page française avec l'en-tête et le pied de page. Le serveur déployé (`91e8235`) montre encore la capture d'origine.

## A4 — Mineure — En-têtes de durcissement absents

`curl -I https://preprod.wagesse.fr/` ne montre ni HSTS, ni `X-Content-Type-Options`, ni `X-Frame-Options`. `x-powered-by: Next.js` est présent.

Correctif dans cette branche : `next.config.js` ajoute ces en-têtes et retire `X-Powered-By`. Aucun vhost nginx n'est modifié. Le contrôle HTTP réel attend le redémarrage autorisé.

## A5 — Amélioration — Refus admin renvoyé en 401

Un client ou un transporteur qui appelle `/api/admin/dashboard` reçoit HTTP 401 et le texte Forbidden. Aucune donnée n'est renvoyée. Un code 403 serait plus exact.

## A6 — Critique npm, non exploitable sur cet hôte

`npm audit --omit=dev` signale une alerte critique Next.js : exécution de code à distance sur un serveur hébergé sous Windows. Le VPS est Ubuntu. Elle ne s'applique pas à cette préproduction. Next n'est pas monté en 16.4.5 dans ce correctif.

axios n'était importé nulle part : la dépendance est retirée, et avec elle follow-redirects. zod est monté dans sa plage (4.6.7). La vérification JWT n'accepte plus que HS256. Après ce changement, l'audit production indique 1 critique, 8 hautes et 1 modérée. Restent des avis sur Prisma, sharp/libvips, postcss, nanoid, source-map-js, jsonwebtoken 8 et uuid. Aucun de ces paquets n'est appelé avec les options qui rendent l'avis exploitable ici (pas de fusion d'objets fournis par le client, pas de générateur nanoid de taille nulle, pas de tampon uuid fourni par l'appelant). jsonwebtoken 9 est une version majeure et n'est pas imposée.

## Non corrigé volontairement

Les écrans admin « en cours de construction », l'absence de notifications utilisateur et le rôle opérateur sans parcours propre sont des manques de produit, pas des régressions réparées ici.
