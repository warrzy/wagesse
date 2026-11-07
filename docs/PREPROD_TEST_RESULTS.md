# Résultats des tests — phase 4

Exécution le 6 novembre 2026, jusqu’à 19:52 (Europe/Paris).

## URL publique

Au 7 novembre 2026, 18:05 (Europe/Paris), `https://preprod.wagesse.fr` ne sert pas WAGESSE. Le certificat présenté reste `ecom-touch.tech`. La recette navigateur de préproduction n’a pas été exécutée : l’installation privilégiée n’est pas autorisée à être relancée.

Le script corrigé refuse de démarrer si les ports 3000, 3001, 3010 ou 5432 sont absents, et il s’arrête si l’un d’eux disparaît. Il n’a pas été lancé sur le serveur.

```text
curl https://preprod.wagesse.fr/
exit 60
subject: CN=ecom-touch.tech
```

Le certificat présenté est celui d’ECOM-TOUCH (Let’s Encrypt, SAN `ecom-touch.tech`, `www.ecom-touch.tech`). Avec le nom ignoré, le HTML a pour titre `ECOM-TOUCH`.

`http://preprod.wagesse.fr/` renvoie la page « Welcome to nginx! » (nginx/1.24.0 Ubuntu, 615 octets).

Les parcours client, camionneur et administrateur, les commandes manuelles, les crédits, les abonnements, les contacts et les notifications n’ont pas été rejoués sur cette URL. Les déclarer réussis serait faux.

## Non-régression locale du commit de travail

Même machine que la phase 3, MariaDB 10.11.14, bases `wagesse_test` et `wagesse_e2e`.

| Commande | Résultat |
| --- | --- |
| `bash -n deploy/preprod/install.sh` | syntaxe acceptée |
| `npm run test:unit` | 12 tests, 12 réussites |
| `npm run test:integration` | 12 tests, 12 réussites |
| `npm run lint` | 0 erreur, 0 avertissement |
| `npx tsc --noEmit` | code 0 |
| `npx playwright test` | 14 tests Chromium, 14 réussites |

Playwright a tourné contre `next start` local sur `127.0.0.1:3100`, base `wagesse_e2e`, comptes de démonstration déjà présents. Il couvre l’accueil, les tarifs, les connexions client, camionneur et admin, les écrans annonces, paiements et transports, le refus d’accès client à `/admin`, le mot de passe oublié, le profil client, le journal, les notifications, les paramètres (`MANUAL`, PayDunya non) et le menu étroit.

Les tests d’intégration de la phase 2, rejoués dans le lot de 12, couvrent le masquage des contacts, le refus d’activation d’un forfait payant, le bac à sable bloqué en production, l’approbation unique d’une commande manuelle et le rejet d’un compte bloqué.

Le journal Prisma « Unique constraint failed » pendant le test de double déblocage est le comportement attendu : la seconde demande est refusée et un seul crédit est consommé.

## Seed de préproduction

Base jetable `wagesse_seedcheck`, créée puis supprimée pendant cet essai :

- `npx prisma migrate deploy` : 6 migrations appliquées ;
- `SEED_DEMO_ACCOUNTS=false npm run seed` : 0 utilisateur, 3 forfaits, 4 packs.

Les comptes `72000001`, `72100001` et `72200001` avec le mot de passe `password123` ne sont pas créés dans ce mode.

## Contrôles du 7 novembre 2026, 18:05 (Europe/Paris)

Exécutés depuis l’agent, sans installation privilégiée sur le VPS.

| Contrôle | Résultat |
| --- | --- |
| `bash -n deploy/preprod/install.sh` | syntaxe acceptée |
| `bash deploy/preprod/install.sh --check` | archive incorrecte refusée avant extraction, somme correcte acceptée, aucune commande Git hors de `wagesse` |
| Injection d’un `git status` en root | refusée par `--check` |
| Somme officielle Node 22.23.4 | `1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce`, identique au téléchargement de `node-v22.23.4-linux-x64.tar.xz` et à `SHASUMS256.txt` |
| `node --check deploy/preprod/create-admin.mjs` | syntaxe acceptée |
| Numéro invalide | message générique, aucun identifiant affiché |
| Exécution admin sans `DATABASE_URL` | message générique, aucun fichier d’identifiants créé |
| `https://ecom-touch.tech/`, `https://preprod.ecomschool.fr/`, `https://wendyam-finance.com/`, `https://tme-machinery.com/` | HTTP 200 |
| Session `wagesse-deploy` | nginx, SSH, PostgreSQL, MariaDB et PM2 actifs ; `wagesse-preprod` inactif ; ports 3000, 3001, 3010, 5432 ouverts ; 3020 fermé ; MariaDB sur `127.0.0.1:3306` |

Un essai local du script admin, lancé avec l’environnement de test déjà présent, a créé puis supprimé une ligne administrateur dans `wagesse_test`. Aucun fichier d’identifiants n’a été conservé. Les parcours métier de https://preprod.wagesse.fr n’ont pas été ouverts.

## Contrôles après l’échec Prisma du 7 novembre 2026, 18:26 (Europe/Paris)

La deuxième installation n’a pas été relancée. Lecture seule ensuite : `wagesse-preprod` inactif, port 3020 fermé, vhost absent, MariaDB limité à `127.0.0.1:3306`, nginx, SSH, PostgreSQL et PM2 actifs. `namei` s’arrête sur `/etc/wagesse` en `drwx------ root root` : le fichier d’environnement existe, le compte de déploiement ne peut pas le lire.

`bash deploy/preprod/install.sh --check` vérifie qu’une URL `mysql://` est masquée, qu’un `source` raté s’arrête avec `set -e`, et que le script ne redonne pas la lecture du fichier au compte `wagesse`. Le schéma de `wagesse_preprod` n’a pas été lu : la session disponible n’a pas d’accès MariaDB. Le journal montre que `migrate deploy` n’a pas abouti.

## Démarrage et ACME, 7 novembre 2026, 18:47 (Europe/Paris)

`systemctl show wagesse-preprod.service` : dernier processus arrêté avec le statut 143 (signal TERM), durée 1,8 s, aucun redémarrage. Le vhost WAGESSE n’est plus présent. Les autres vhosts n’ont pas de bloc `server_name preprod.wagesse.fr`. Le serveur par défaut utilise `root /var/www/html` et répond 404 si le fichier n’y est pas. `bash -n` et `install.sh --check` contrôlent que le défi pointe vers ce répertoire et qu’il est aussi demandé sur l’URL publique. L’installation n’a pas été relancée.

## Ce qui reste à exécuter sur le serveur

Après l’installation réelle : ouverture de https://preprod.wagesse.fr avec un certificat au nom `preprod.wagesse.fr`, connexion administrateur, création d’une commande manuelle, approbation, solde de crédits, et contrôle que https://ecom-touch.tech répond encore.
