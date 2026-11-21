# Déploiement préproduction de la refonte visuelle

Ne pas lancer cette procédure sans autorisation. Elle reconstruit l’application WAGESSE et redémarre uniquement `wagesse-preprod.service`. Elle ne touche pas MariaDB, les comptes, nginx, les autres vhosts ni les sauvegardes déjà présentes.

Le script existant `deploy/preprod/deploy-auth-simple.sh` convient : il refuse un changement de `prisma/schema.prisma` ou de `prisma/migrations`, conserve `PHONE_VERIFICATION_REQUIRED=false`, sauvegarde `.next`, `node_modules` et l’environnement, puis revient au commit précédent si le build ou le démarrage échoue.

Depuis `/root/wagesse-preprod-src`, après avoir vérifié que le commit contient cette refonte et que `sha256sum -c deploy/preprod/SHA256SUMS` réussit :

```bash
cd /root/wagesse-preprod-src
git fetch --no-tags origin <commit de la refonte>
git checkout --detach <commit de la refonte>
test "$(git rev-parse HEAD)" = "<commit de la refonte>"
( cd deploy/preprod && sha256sum -c SHA256SUMS )
bash deploy/preprod/preflight.sh <commit de la refonte>
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple <commit de la refonte>
```

Le commit réellement installé est affiché par le script. En cas d’erreur, ne pas relancer. Les sauvegardes `/var/backups/wagesse-preprod/rollback-20261107T214947Z` et `/var/backups/wagesse-preprod/rollback-auth-simple-20261121T112523Z` restent en place. Une nouvelle sauvegarde est créée par le script avant modification.

La production reste NO-GO.
