# Déploiement de la marque dynamique

Non exécuté. Le changement ne touche ni Prisma, ni l’authentification, ni les paiements. La procédure déjà écrite dans `docs/production/LANCEMENT_V1.md` s’applique telle quelle, avec le commit de cette branche une fois le contrôle CI vert.

Préproduction, depuis `/root/wagesse-preprod-src` :

```bash
git fetch --no-tags origin <commit>
git checkout --detach <commit>
test "$(git rev-parse HEAD)" = "<commit>"
( cd deploy/preprod && sha256sum -c SHA256SUMS )
bash deploy/preprod/preflight.sh <commit>
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple <commit>
```

Le script sauvegarde l’application, vérifie le commit, refuse un changement de schéma et ne redémarre que `wagesse-preprod.service`. En cas d’échec, il revient au commit précédent. Les autres sites du VPS ne sont pas concernés.

Après l’installation de la production, le même commit se déploie avec :

```bash
WAGESSE_PRODUCTION_AUTHORIZE=yes bash deploy/production/deploy.sh <commit complet>
```

Cette commande non plus n’est pas lancée ici. La base de préproduction n’est pas copiée.
