# Lancement V1

Aucune de ces commandes n'a été exécutée. Elles attendent une autorisation explicite. Les autres sites du VPS ne sont pas concernés. Les comptes et données fictifs de préproduction ne sont pas copiés.

## 1. Préproduction de la refonte

Le commit à déployer est le sommet de la pull request de refonte, une fois le contrôle CI vert. Il contient déjà l'authentification simple. L'application en service reste le commit déjà installé tant que cette étape n'est pas lancée. Depuis `/root/wagesse-preprod-src` :

```bash
git fetch --no-tags origin <commit>
git checkout --detach <commit>
test "$(git rev-parse HEAD)" = "<commit>"
( cd deploy/preprod && sha256sum -c SHA256SUMS )
bash deploy/preprod/preflight.sh <commit>
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple <commit>
```

Le script sauvegarde l'application, vérifie le commit, refuse un changement de schéma Prisma et ne redémarre que `wagesse-preprod.service`. En cas d'erreur, ne pas relancer : le retour au commit précédent est automatique. Conserver `/var/backups/wagesse-preprod/rollback-20261107T214947Z` et `/var/backups/wagesse-preprod/rollback-auth-simple-20261121T112523Z`.

## 2. Première production, séparée

À préparer avant toute ouverture, sans réutiliser la base ni les secrets de préproduction.

1. Créer l'utilisateur `wagesse-prod`, le dépôt `/opt/wagesse-prod/app` et Node dans `/opt/wagesse-prod/.node`.
2. Créer la base MariaDB `wagesse`, avec un utilisateur et un mot de passe nouveaux. Ne pas importer `wagesse_preprod`.
3. Écrire `/etc/wagesse/production.env` en mode 600. `PHONE_VERIFICATION_REQUIRED=false` pour la V1. `PAYMENT_MODE=MANUAL`. `JWT_SECRET` distinct. Pas de `WAGESSE_DEPLOYMENT=preprod`, pas de `PREPROD_TEST_PHONE_VERIFY`, pas de `OTP_DEBUG_RETURN=true`.
4. Contrôler le fichier : `node deploy/production/assert-env.mjs /etc/wagesse/production.env`. La commande ne doit rien afficher d'autre que l'acceptation.
5. Appliquer les migrations sur la base neuve : `npx prisma migrate deploy`. Ne pas lancer `migrate reset` et ne pas exécuter le seed de démonstration.
6. Créer un administrateur nouveau. Ne pas réutiliser les numéros 7800 de recette.
7. Installer `deploy/production/wagesse-prod.service.example` sous `/etc/systemd/system/wagesse-prod.service`, puis `systemctl enable --now wagesse-prod.service`. Le service écoute `127.0.0.1:3030`.
8. Après autorisation du nom de domaine, déposer `deploy/production/nginx-wagesse.conf.example` dans un fichier de site dédié, obtenir le certificat de ce seul nom, puis `nginx -t` avant rechargement. `wagesse.fr` pointe encore vers LWS : le changement DNS est une décision séparée.
9. Sauvegarde hors du VPS, avant l'ouverture : `mysqldump --single-transaction` de la base de production, chiffré, copié vers une machine qui n'est pas ce serveur. Restaurer une fois sur une base jetable et compter les utilisateurs. Ne pas versionner le dump.

## 3. Déploiements suivants

Une fois la production installée, un commit validé se déploie par une seule commande. Elle vérifie l'environnement, sauvegarde le runtime, détache le commit demandé, lance `prisma migrate deploy` uniquement sur la base de production, reconstruit et ne redémarre que `wagesse-prod.service`. Si le démarrage échoue, elle revient au commit et au runtime précédents sans restaurer la base.

```bash
WAGESSE_PRODUCTION_AUTHORIZE=yes bash deploy/production/deploy.sh <commit complet>
```

La production reste fermée tant que les étapes de la section 2 ne sont pas autorisées et faites.
