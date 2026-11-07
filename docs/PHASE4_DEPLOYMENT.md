# Déploiement préproduction — phase 4

Date des contrôles : 6 novembre 2026, 19:47–19:52 (Europe/Paris).

## Résultat

WAGESSE n’est pas encore en service sur https://preprod.wagesse.fr. La deuxième exécution, le 7 novembre 2026 à 18:26 (Europe/Paris), a installé les dépendances et généré le client Prisma, puis s’est arrêtée : `/etc/wagesse` est en mode 700, propriétaire root, et le compte `wagesse` ne peut pas lire `/etc/wagesse/preprod.env`. Prisma a donc démarré sans `DATABASE_URL`. Le vhost et le service ne sont pas en place. Les ports 3000, 3001, 3010, 5432 et MariaDB sur `127.0.0.1:3306` répondaient encore au contrôle suivant.

Le 7 novembre 2026 à 18:47 (Europe/Paris), le service a été arrêté par le signal 143 environ deux secondes après son lancement, et le contrôle ACME a reçu un 404. Le serveur nginx par défaut publie `/var/www/html` ; le jeton était écrit dans `/var/www/letsencrypt`, que ce serveur ne sert pas. Le script dépose maintenant le défi dans `/var/www/html/.well-known/acme-challenge/`, le vérifie en local et en public, et attend le port 3020 jusqu’à une minute. En cas d’arrêt réel du service, le journal est affiché sans les secrets.

Le 7 novembre 2026 à 19:19 (Europe/Paris), la reprise a compilé Next.js, obtenu le certificat Let’s Encrypt de `preprod.wagesse.fr` (expiration le 5 février 2027) et réussi `nginx -t`. Le contrôle TLS suivant n’a fait qu’une lecture, dans la seconde du rechargement. nginx 1.24 garde alors d’anciens workers qui présentent encore le certificat par défaut `ecom-touch.tech`. Le script a pris cette lecture pour un échec et a retiré le vhost. Le certificat reste dans `/etc/letsencrypt/live/preprod.wagesse.fr`. La reprise suivante le réutilise, attend cinq présentations consécutives du bon nom en IPv4 et en IPv6, affiche le sujet réellement lu si ce nom n’arrive pas, et ne relance pas `npm ci` ni `next build` lorsque ce build est déjà celui du commit épinglé. SHA-256 de `deploy/preprod/install.sh` : `72bfcab75793f202c09cee8ab6fb28aa513ae08d6a9d23fa2f26d3e8edf5892c`.

## Inventaire console du 7 novembre 2026

| Élément | Valeur |
| --- | --- |
| Hôte | `srv1392968`, Ubuntu 24.04.4 LTS, noyau 6.8.0-147-generic |
| Ressources | 7,8 Gio de RAM, charge 0, disque 16 Go utilisés sur 96 Go |
| Node global | v24.14.0, conservé. WAGESSE utilise Node 22.23.4 dans `/opt/wagesse-preprod/.node` |
| PostgreSQL | actif sur `127.0.0.1:5432` et `[::1]:5432`. Non modifié |
| MariaDB | 10.11.14, actif, `127.0.0.1:3306` seulement. La reprise ne le réinstalle pas et ne redémarre pas le service s’il est déjà actif |
| nginx | actif. Rechargement seulement après `nginx -t`. Jamais `restart` |
| PM2 | `pm2-deploy.service` actif. Le script ne l’appelle pas |
| Port 3000 | Wendyam Finance, `0.0.0.0:3000` |
| Port 3001 | ECOM-SCHOOL, `127.0.0.1:3001` |
| Port 3010 | ECOM-TOUCH, toutes interfaces. Le script refuse de s’y placer |
| Port 3020 | libre après l’échec de 18:26 (Europe/Paris). Seule écoute autorisée : `127.0.0.1:3020` |
| Vhosts | `default`, `ecom-touch-public.conf`, `preprod.ecomschool.fr.conf`, `tme-machinery`, `wendyam-finance`. Pas de `preprod.wagesse.fr` |

Le script archive les vhosts, compare leurs sommes MD5 après coup, et retire uniquement le sien si un autre nom HTTPS change de statut. Il ne redémarre pas ces applications.

L’ancienne version du script, au commit `91e8235`, cherchait un port à partir de 3010. Il ne faut pas l’exécuter. Le code applicatif déployé reste ce commit. Le script à lancer est celui de la branche `cursor/preprod-deployment-ba0b` à jour, qui fixe le port 3020 et vérifie l’archive Node avant extraction.

## Commit retenu

| Élément | Valeur |
| --- | --- |
| Phase 3 | `cfd5b5dd949e921b485a19405255f0ac5274d1ca` sur `cursor/phase3-launch-readiness-ba0b` (PR #4) |
| Phase 2 incluse | `8d813ae` (PR #3, qui contient la PR #2) |
| `main` | `bf64432`, non modifié |
| Branche à déployer | `cursor/preprod-deployment-ba0b` |
| Commit installé par le script | `91e8235de45f3dfd58be558dc4636147d2a7d8df` |

Le script à exécuter est celui de la branche à jour. Il déploie le code applicatif `91e8235de45f3dfd58be558dc4636147d2a7d8df` (`SEED_DEMO_ACCOUNTS=false`, sans les comptes `password123`). `DEPLOY_REF` permet d’en choisir un autre. Le fichier `install.sh` de ce commit-là ne doit pas être lancé : il choisissait un port à partir de 3010.

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
- compte administrateur créé par `wagesse`, jamais en root ; le numéro et le mot de passe ne sont pas journalisés ;
- systemd `wagesse-preprod.service`, écoute fixe `127.0.0.1:3020` ;
- vhost nginx nommé `preprod.wagesse.fr` uniquement, `listen 443 ssl` sans `http2` ;
- certificat Let’s Encrypt `--cert-name preprod.wagesse.fr` seulement, crochet de renouvellement qui recharge nginx pour ce certificat seul.

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

## Pour relancer l’installation

La commande s’exécute dans le terminal root du VPS. Elle réutilise MariaDB, l’utilisateur `wagesse`, Node s’il est déjà en 22.23.4, et le clone. Elle ne fait pas `migrate reset`, ne supprime pas la base et ne réinstalle pas MariaDB si `mysql` est déjà présent.

Le certificat émis le 7 novembre 2026 à 19:19 (Europe/Paris) est conservé : la reprise ne relance pas Certbot et ne reconstruit pas Next.js si le build du commit `91e8235` est déjà là. En cas d’échec avant le certificat, le script retire seulement le vhost et le service WAGESSE. Un code de sortie 2 signifie que le vhost local répond et qu’il ne faut pas appeler `restore_wagesse`. La fonction `restore_wagesse` ne touche ni MariaDB, ni PostgreSQL, ni les autres vhosts.

```bash
set +o history
umask 077
if [[ ! -d /root/wagesse-preprod-src/.git ]]; then
  git clone https://github.com/warrzy/wagesse.git /root/wagesse-preprod-src
fi
cd /root/wagesse-preprod-src
git fetch origin cursor/preprod-deployment-ba0b
git checkout --detach origin/cursor/preprod-deployment-ba0b
test "$(sha256sum deploy/preprod/install.sh | awk '{print $1}')" = "72bfcab75793f202c09cee8ab6fb28aa513ae08d6a9d23fa2f26d3e8edf5892c"
bash deploy/preprod/install.sh --check

restore_wagesse() {
  systemctl disable --now wagesse-preprod.service 2>/dev/null || true
  rm -f /etc/nginx/sites-enabled/preprod.wagesse.fr
  rm -f /etc/nginx/sites-available/preprod.wagesse.fr
  nginx -t && systemctl reload nginx
  echo "Vhost et service WAGESSE retirés. Base et autres sites conservés."
}

read -rs -p "ADMIN_PHONE : " ADMIN_PHONE
echo
export ADMIN_PHONE
set +e
bash deploy/preprod/install.sh
status=$?
set -e
unset ADMIN_PHONE
if [[ "${status}" -eq 2 ]]; then
  echo "HTTPS en place. Ne pas appeler restore_wagesse."
elif [[ "${status}" -ne 0 ]]; then
  echo "Échec ${status}. restore_wagesse retire le vhost sans supprimer la base."
fi
```

Le numéro ne va pas dans Git ni dans la ligne de commande. Le mot de passe administrateur reste dans `/etc/wagesse/preprod-admin.credentials`, mode 600, propriétaire root.
