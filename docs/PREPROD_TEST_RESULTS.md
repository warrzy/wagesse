# Résultats des tests — phase 4

Exécution le 6 novembre 2026, jusqu’à 19:52 (Europe/Paris).

## URL publique

`https://preprod.wagesse.fr` ne sert pas WAGESSE.

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

## Ce qui reste à exécuter sur le serveur

Après l’installation réelle : ouverture de https://preprod.wagesse.fr avec un certificat au nom `preprod.wagesse.fr`, connexion administrateur, création d’une commande manuelle, approbation, solde de crédits, et contrôle que https://ecom-touch.tech répond encore.
