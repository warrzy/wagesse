# Déploiement préproduction — phase 4

Date des contrôles : 6 novembre 2026, 19:47–19:52 (Europe/Paris).

## Résultat

WAGESSE n’est pas en service sur https://preprod.wagesse.fr. L’installation sur le VPS n’a pas été lancée : SSH répond `Permission denied (publickey,password)` pour `root` et `ubuntu`, et cette session ne possède aucune clé privée.

Le site HTTPS déjà présent sur `147.79.118.212` est ECOM-TOUCH (`ecom-touch.tech`). Il n’a pas été arrêté, modifié ni remplacé.

## Commit retenu

| Élément | Valeur |
| --- | --- |
| Phase 3 | `cfd5b5dd949e921b485a19405255f0ac5274d1ca` sur `cursor/phase3-launch-readiness-ba0b` (PR #4) |
| Phase 2 incluse | `8d813ae` (PR #3, qui contient la PR #2) |
| `main` | `bf64432`, non modifié |
| Branche à déployer | `cursor/preprod-deployment-ba0b` |

Cette branche ajoute le refus des comptes de démonstration (`SEED_DEMO_ACCOUNTS=false`) et `deploy/preprod/install.sh`. Le SHA à déployer est le HEAD de cette branche. Le script fait `git checkout` de `DEPLOY_REF` (défaut : cette branche).

`main` ne reçoit pas le déploiement.

## Audit externe du VPS

Commandes exécutées depuis l’agent, sans session sur le serveur.

| Contrôle | Résultat |
| --- | --- |
| DNS `preprod.wagesse.fr` | A `147.79.118.212`. Pas d’enregistrement MX propre. |
| DNS `wagesse.fr` | A `213.255.195.59`, AAAA LWS, NS `*.lwsdns.com`, MX `10 mail.wagesse.fr` |
| `mail.wagesse.fr` | A `213.255.195.52`. SPF : `v=spf1 mx:wagesse.fr a:mail.wagesse.fr a:mailphp.lws-hosting.com -all` |
| `www.wagesse.fr` | A `213.255.195.59` |
| Ports ouverts | 22, 80, 443. 3306, 3000, 8080 et 8443 ne répondent pas depuis l’extérieur. |
| HTTP `preprod.wagesse.fr` et l’IP | nginx/1.24.0 (Ubuntu), page « Welcome to nginx! », 615 octets, `Last-Modified: Fri, 27 Feb 2026 10:03:09 GMT` |
| HTTPS sans ignorer le nom | `curl` code 60. Certificat CN `ecom-touch.tech`, SAN `ecom-touch.tech` et `www.ecom-touch.tech`, Let’s Encrypt YE1, du 6 novembre 2026 13:24 UTC au 4 février 2027 |
| HTTPS en ignorant le nom | Titre `ECOM-TOUCH`, en-têtes Next.js |
| SSH | Bannière joignable, authentification refusée. Empreinte `ssh-ed25519 SHA256:eooKB5UVIIg/5nGEwa95yBERhXxYwEHnLzyFe2ggEBw` |
| Système, Node, MariaDB, sauvegardes, mémoire | Non lus : ils exigent une session. nginx 1.24.0 (Ubuntu) correspond au paquet d’Ubuntu 24.04, sans confirmation par `/etc/os-release`. |

Aucun enregistrement DNS n’a été modifié. La messagerie LWS reste sur `mail.wagesse.fr`.

## Installation préparée, non exécutée sur le VPS

`deploy/preprod/install.sh` est prévu pour être lancé en root, avec `ADMIN_PHONE` :

- utilisateur système `wagesse`, répertoire `/opt/wagesse-preprod` ;
- Node 22.23.4 dans ce répertoire, sans remplacer un Node déjà utilisé par une autre application ;
- base `wagesse_preprod` et utilisateur MySQL limité à cette base ;
- `prisma migrate deploy` sur une base neuve (6 migrations, checksums vérifiés plus bas) ;
- `SEED_DEMO_ACCOUNTS=false` : forfaits et packs, aucun compte `password123` ;
- administrateur créé seulement pour `ADMIN_PHONE`, mot de passe aléatoire dans `/etc/wagesse/preprod-admin.credentials` (mode 600) ;
- systemd `wagesse-preprod.service`, écoute `127.0.0.1` sur le premier port libre de 3010 à 3020 ;
- vhost nginx nommé `preprod.wagesse.fr` uniquement ;
- certificat Let’s Encrypt propre à ce nom, sans réécrire le certificat `ecom-touch.tech`.

Le script s’arrête si le vhost préproduction mentionne `ecom-touch`, ou si l’utilisateur `wagesse` existe avec un autre répertoire. Il archive `/etc/nginx/sites-available` et `sites-enabled` dans `/var/backups/wagesse-preprod/` avant d’ajouter son fichier. Il ne fait pas `apt-get upgrade` et ne supprime aucune autre base.

## Migrations

Sur une base locale créée pour l’essai (`wagesse_seedcheck`), `npx prisma migrate deploy` a appliqué les 6 fichiers. Les checksums SHA-256 lus dans `_prisma_migrations` de `wagesse_test` sont identiques aux fichiers du dépôt :

| Migration | Checksum |
| --- | --- |
| `20260730235411_init` | `00d1c78730a1370d9872b1abe4f34240221f921f7f9821f084cc429b7e07d88c` |
| `20260731002419_add_quote_vehicle_notes_withdrawn` | `db4a8e4ef1d580649a58cb29d5356c7168399bd3ba3704bf729930e3271c0244` |
| `20260802013334_subscription_wallet_split` | `e0aa2246f70be1ce8a6dd7b5e98f021f0b60c44c186a17a4b80d7a421cc34396` |
| `20260807141014_fix_subscriptionplan_json` | `f0ceebf0004304764f9a138a4fa44216b3db1f21617635b194a49bbef93ee350` |
| `20260808110727_add_plan_publishing_fields` | `adfe20bd4783b0020f27991369347d1c17d0759457dccf8a8fff7d173dca8d4a` |
| `20261106183000_commercial_orders_and_idempotency` | `a12883b7961b303b60f4911ff06bbf74648c07d113771b7511406720ac42fe6e` |

Une base neuve accepte donc `migrate deploy`. Une base qui aurait appliqué les anciens fichiers en minuscules (avant la correction de casse de la phase 2) échouerait sur le checksum : la réconcilier avec `prisma migrate resolve`, sans `migrate reset`.

Le seed d’essai avec `SEED_DEMO_ACCOUNTS=false` a laissé 0 utilisateur, 3 forfaits et 4 packs. La base d’essai a ensuite été supprimée. `wagesse_test` et `wagesse_e2e` n’ont pas été supprimées.

## Pour lancer l’installation

Une clé SSH autorisée sur le VPS est nécessaire. Ensuite, sur le serveur :

```bash
git clone https://github.com/warrzy/wagesse.git
cd wagesse
git checkout cursor/preprod-deployment-ba0b
ADMIN_PHONE=<numéro opérateur> CERTBOT_EMAIL=<adresse> bash deploy/preprod/install.sh
```

Le numéro et l’adresse ne vont pas dans Git. Le mot de passe administrateur reste dans `/etc/wagesse/preprod-admin.credentials`.
