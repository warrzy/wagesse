# Audit npm — préproduction

Contrôle du 7 novembre 2026 sur le lockfile du commit applicatif `91e8235de45f3dfd58be558dc4636147d2a7d8df`. Ce lockfile est identique sur la branche de déploiement. Aucun paquet n’a été modifié. `npm audit fix --force` n’a pas été utilisé. `npm audit fix --dry-run` n’a pas écrit `package.json` ni `package-lock.json`.

## Volumes

| Périmètre | Critique | Élevé | Modéré | Total |
| --- | --- | --- | --- | --- |
| Production (`npm audit --omit=dev`) | 1 | 11 | 1 | 13 |
| Développement seulement | 0 | 2 | 8 | 10 |
| Ensemble | 1 | 13 | 9 | 23 |

Les 23 alertes du journal d’installation correspondent à l’ensemble, dépendances de développement comprises. Le service en production n’installe pas le groupe de développement au moment de `npm ci` si l’on passe `--omit=dev` ; le script actuel lance `npm ci` complet parce que Prisma et le build en ont besoin sur la machine de déploiement.

## Correctifs compatibles avec les plages actuelles

`npm audit fix` sans `--force` proposerait ces montées, toutes déjà autorisées par les plages du `package.json` :

| Paquet | Installé | Cible | Rôle |
| --- | --- | --- | --- |
| `next` | 16.2.12 | 16.4.5 | production, alerte critique |
| `axios` | 1.19.0 | 1.21.0 | production directe |
| `zod` | 4.4.3 | 4.6.7 | production directe |
| `eslint-config-next` | 16.2.10 | 16.4.5 | développement |
| `follow-redirects` | 1.16.0 | 1.16.2 | transitivité d’axios |
| `nanoid` | 3.3.16 | 3.3.20 | transitivité |
| `source-map-js` | 1.2.1 | 1.2.2 | transitivité |
| `postcss` imbriqué sous Next | 8.4.31 | 8.5.23 | transitivité. La copie racine est déjà en 8.5.25 |
| `sharp` | 0.34.5 | 0.35.5 | entraîné par Next 16.4.5 |

Ces montées ne sont pas appliquées dans ce correctif de déploiement. Next 16.4 reste une évolution du framework : elle demande la suite de non-régression avant de changer le commit applicatif servi en préproduction.

## Sans correctif dans la plage actuelle

| Paquet | Installé | Seule cible indiquée | Décision |
| --- | --- | --- | --- |
| `jsonwebtoken` | 8.5.1 | 9.0.3, version majeure | Pas de montée sans adaptation du code et tests |
| `uuid` | 9.0.1 | 14.0.3, version majeure | Pas de montée. L’avis concerne les appels avec tampon fourni |
| `prisma`, `@prisma/config`, `deepmerge-ts` | Prisma 6.19.3 | l’avis couvre Prisma jusqu’à 7.10.0 | `npm audit fix` ne propose pas de remplacement. Pas de passage à une majeure |

Pour les outils de développement, la cible `eslint-config-next@15.5.29` indiquée par une partie des avis est une descente incompatible avec Next 16. Le dry-run sans `--force` aligne plutôt cet outil sur 16.4.5. `brace-expansion` et `js-yaml` restent des dépendances indirectes de développement.

## Décision du 7 novembre 2026, seconde recette

axios n'est importé par aucun fichier du dépôt. La dépendance directe est retirée, ainsi que follow-redirects. zod est résolu en 4.6.7, dans la plage déjà déclarée. Next reste en 16.2 : l'alerte critique décrit une exécution de code sur un serveur Windows, et 16.4.5 est une évolution de framework non essayée sur la préproduction. La signature et la vérification JWT précisent l'algorithme HS256. jsonwebtoken n'est pas passé en version 9.

`npm audit --omit=dev` après ces changements : 1 critique, 8 hautes, 1 modérée. Les hautes restantes sont next (la même alerte Windows), Prisma et deepmerge-ts, jsonwebtoken, nanoid, postcss, sharp/libvips, source-map-js. uuid reste modéré. Le code applicatif n'appelle pas nanoid ni uuid avec un tampon ou une taille fournis par un client.

## Relecture après le cycle réussi

Le 7 novembre 2026, 23:15 (Europe/Paris), le même lockfile donne encore 1 critique, 8 élevées et 1 modérée. Next 16.4.5 corrigerait l'avis Windows mais n'a pas été déployé après la recette. Prisma n'a pas de correctif dans la version majeure actuelle. jsonwebtoken 9 et uuid 14 restent des montées majeures non appliquées.
