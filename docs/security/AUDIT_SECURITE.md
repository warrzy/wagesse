# Contrôles de sécurité — préproduction

Date de la première campagne : 7 novembre 2026, 19:50 (Europe/Paris). Mise à jour après le cycle : 7 novembre 2026, 23:20 (Europe/Paris). Cible : https://preprod.wagesse.fr. Aucun test destructif sur les autres applications du VPS.

## Résultats exécutés

| Contrôle | Résultat |
| --- | --- |
| Inscription avec le rôle ADMIN | Refusée, HTTP 400 |
| Mot de passe incorrect | HTTP 401, message générique |
| Tableau de bord admin sans jeton | HTTP 401 |
| Tableau de bord admin avec un client | HTTP 401, aucune donnée |
| Liste des utilisateurs avec un transporteur | HTTP 401 |
| Demande d'un autre client | HTTP 403 |
| Refus d'un devis d'un autre client | HTTP 403 |
| Véhicules d'un autre transporteur | absents de la liste |
| Devis du client | deux devis, numéros de transporteurs absents du JSON |
| Second devis du même transporteur | HTTP 400 |
| Achat, forfait et déblocage sans téléphone vérifié | HTTP 403, solde resté à 0 |
| Webhook PayDunya forgé | HTTP 403, PayDunya désactivé |
| Mot de passe oublié | réponse sans code, SMS non délivré |
| Code de réinitialisation faux | HTTP 400, l'ancien mot de passe fonctionne encore |
| Page /admin ouverte par un transporteur | tableau de bord transporteur, pas l'administration |

## Site au commit 627cb4f

Relecture du 7 novembre 2026, 23:14 (Europe/Paris). HSTS, nosniff, DENY, Referrer-Policy et Permissions-Policy sont servis. `X-Powered-By` est absent. La vérification JWT n'accepte que HS256. axios est retiré. zod est en 4.6.7.

`npm audit --omit=dev` : 1 critique, 8 élevées, 1 modérée. La critique Next.js vise un serveur Windows. Prisma, jsonwebtoken 8, nanoid, postcss, sharp, source-map-js et uuid restent. Aucun n'est appelé sur le chemin qui rend l'avis exploitable ici. Next n'est pas monté en 16.4.5 après la recette réussie.

## Vérification téléphonique

Production : code à six chiffres, dix minutes, cinq essais, SMS HTTP avec URL et clé hors dépôt, aucun code dans la réponse lorsque NODE_ENV est production. La simulation et OTP_DEBUG_RETURN restent absents.

La route de recette répond 404 sauf si le déploiement vaut preprod, le drapeau vaut exactement true, la base est wagesse_preprod, et l'hôte est preprod.wagesse.fr, 127.0.0.1 ou localhost. Le contrôle d'hôte est dans le dépôt après le cycle. Il n'a pas encore été redémarré. `deploy/production/assert-env.mjs` refuse un fichier de production qui recopierait le mécanisme, sans imprimer les secrets.

## Limites

Le compte administrateur initial n'a pas été utilisé. Firefox et Safari n'ont pas été ouverts. Les doubles validations ont été exécutées par le cycle API, pas filmées.
