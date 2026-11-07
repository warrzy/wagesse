# Configuration serveur prévue — préproduction

État constaté le 6 novembre 2026 à 19:50 (Europe/Paris). La configuration ci-dessous est celle du script `deploy/preprod/install.sh`. Elle n’est pas encore appliquée sur `147.79.118.212`.

## Ce qui est déjà sur le VPS

- Reverse proxy : nginx/1.24.0 (Ubuntu).
- Port 80, vhost par défaut : page d’accueil nginx.
- Port 443, certificat par défaut : `ecom-touch.tech` et `www.ecom-touch.tech`, application Next.js ECOM-TOUCH.
- `preprod.wagesse.fr` n’a pas de vhost nommé. La requête HTTPS reçoit donc le certificat et le site par défaut, et la vérification du nom échoue.
- MariaDB ou MySQL n’est pas exposé sur Internet (port 3306 fermé depuis l’extérieur). La version locale n’a pas été lue.
- Node.js sur le serveur n’a pas été lu.

ECOM-TOUCH, son certificat et son vhost restent en place. Le vhost WAGESSE ne porte que `server_name preprod.wagesse.fr` et n’utilise pas `default_server`.

## DNS à ne pas modifier

| Nom | Rôle | Valeur observée |
| --- | --- | --- |
| `wagesse.fr` | Site et hébergement LWS | `213.255.195.59` |
| `www.wagesse.fr` | Site LWS | `213.255.195.59` |
| `mail.wagesse.fr` | Messagerie | `213.255.195.52` |
| MX | Messagerie | `10 mail.wagesse.fr` |
| SPF | Messagerie | `v=spf1 mx:wagesse.fr a:mail.wagesse.fr a:mailphp.lws-hosting.com -all` |
| `preprod.wagesse.fr` | VPS | `147.79.118.212`, sans MX |

Aucun changement DNS n’est nécessaire pour la préproduction : l’enregistrement A existe déjà.

## Processus WAGESSE

| Élément | Valeur |
| --- | --- |
| Utilisateur | `wagesse`, shell `nologin` |
| Code | `/opt/wagesse-preprod/app` |
| Node | `/opt/wagesse-preprod/.node` (22.23.4), distinct du Node système |
| Service | `wagesse-preprod.service` |
| Écoute | `127.0.0.1:3020` uniquement. 3000, 3001 et 3010 restent aux applications déjà présentes |
| Environnement | `/etc/wagesse/preprod.env`, mode 640, groupe `wagesse` |
| Identifiants admin | `/etc/wagesse/preprod-admin.credentials`, mode 600, root |

Variables métier du fichier d’environnement :

- `NODE_ENV=production`
- `PAYMENT_MODE=MANUAL`
- `PAYDUNYA_ENABLED=false`, clés PayDunya vides
- `PAYMENT_PROVIDER=orange_money_production` avec identifiants Orange vides. Le service de paiement est construit au chargement du module et refuse un nom inconnu. Le nom `orange_money_sandbox` n’est pas utilisé. Le parcours d’achat lit `PAYMENT_MODE` et crée une commande manuelle.
- `SMS_PROVIDER=http`, URL et clé vides. `SMS_ALLOW_SIMULATE` et `OTP_DEBUG_RETURN` restent vides. Aucun code n’est journalisé. Tant que le fournisseur SMS n’est pas renseigné, l’inscription crée le compte et signale que le SMS n’est pas parti.
- `SEED_DEMO_ACCOUNTS=false`
- `NEXT_PUBLIC_APP_URL=https://preprod.wagesse.fr`
- `JWT_SECRET` et mot de passe MariaDB générés sur le serveur

## Base

- Nom : `wagesse_preprod`
- Utilisateur : `wagesse_preprod`@`localhost`
- Droits : uniquement sur `wagesse_preprod.*`
- Jeu de caractères : `utf8mb4` / `utf8mb4_unicode_ci`
- Application des migrations : `npx prisma migrate deploy`

## Nginx et TLS

Fichier ajouté : `/etc/nginx/sites-available/preprod.wagesse.fr`, lien dans `sites-enabled`.

- Port 80 : défi ACME dans `/var/www/letsencrypt`, puis redirection vers HTTPS une fois le certificat obtenu.
- Port 443 : `listen 443 ssl` et `listen [::]:443 ssl`, sans `http2`, comme ECOM-TOUCH, ECOM-SCHOOL et TME. Wendyam Finance est le seul vhost en `ssl http2`. Ajouter un second `http2` redéfinit les options du port 443.
- `nginx -t` avant chaque rechargement.

Le certificat ECOM-TOUCH n’est pas dans ce chemin.

## Commande de contrôle après installation

```bash
systemctl status wagesse-preprod.service
curl -fsS -o /dev/null -w "%{http_code}\n" https://preprod.wagesse.fr/
curl -fsS http://127.0.0.1/ -H "Host: ecom-touch.tech" 
```

La seconde requête, ou https://ecom-touch.tech, doit rester le site ECOM-TOUCH.
