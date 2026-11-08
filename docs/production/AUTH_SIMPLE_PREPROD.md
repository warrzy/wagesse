# Déploiement préproduction — authentification simple

Ce document ne lance aucun déploiement. La production et le domaine commercial ne sont pas concernés. Les autres applications du VPS ne sont pas modifiées.

Le site sert aujourd'hui `627cb4fc0fcd014e8743db2249b1887fe71dd173`. L'authentification simple est le commit `d01574087fcbf740e7d9bd5ea4f715a32f7ed113`, ancêtre du commit qui contient le script. Le schéma Prisma est identique : aucune migration n'est lancée.

## Effet du script

`deploy/preprod/deploy-auth-simple.sh` :

- vérifie les sommes SHA-256 et le fait que le commit contient la préproduction actuelle et l'authentification simple ;
- sauvegarde le commit, `.next`, `node_modules` et `/etc/wagesse/preprod.env` ;
- ne copie ni ne modifie MariaDB ;
- contrôle le compte `wagesse` et le mode 600 du fichier d'environnement ;
- installe les dépendances dans le répertoire applicatif, exécute `prisma generate`, le contrôle TypeScript, puis le build Next.js ;
- pose `PHONE_VERIFICATION_REQUIRED=false` ;
- redémarre uniquement `wagesse-preprod.service` ;
- vérifie `https://preprod.wagesse.fr` et le refus d'écriture de la politique ;
- restaure l'application et son fichier d'environnement au premier échec, sans restaurer la base.

La rotation des mots de passe n'est pas relancée. La vérification fictive n'est ni appelée ni élargie. `OTP_DEBUG_RETURN=true` ou `SMS_ALLOW_SIMULATE=true` arrête le script avant modification.

## Précontrôle, après autorisation root

Depuis une copie du commit à déployer, distincte de l'application en service :

```bash
bash deploy/preprod/preflight.sh <commit complet>
```

Contrôles en lecture seule sur le VPS, avant la commande de déploiement :

```bash
runuser -u wagesse -- git -C /opt/wagesse-preprod/app rev-parse HEAD
systemctl is-active wagesse-preprod.service
ss -ltnH 'sport = :3020'
stat -c '%U %a' /opt/wagesse-preprod/app /etc/wagesse/preprod.env
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3020/
curl -fsS -o /dev/null -w '%{http_code}\n' https://preprod.wagesse.fr/
```

La première commande doit afficher `627cb4fc0fcd014e8743db2249b1887fe71dd173` lors du premier déploiement. Le fichier d'environnement doit appartenir à un mode `600`. Ne pas afficher son contenu.

## Déploiement, après autorisation root

```bash
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple <commit complet>
```

Ne pas utiliser `run-step.sh deploy` pour cette évolution : ce chemin conserve aussi le drapeau de vérification fictive tel qu'il était, mais le script dédié est celui qui impose le mode A et refuse une modification Prisma.

## Reprise après l'échec TypeScript

Le déploiement de `e89eb5cb6e050ef40c6d126eac371b2fe0ab6cba` s'est arrêté au contrôle TypeScript. Le service est revenu à `627cb4fc0fcd014e8743db2249b1887fe71dd173`. Conserver cette sauvegarde et `/var/backups/wagesse-preprod/rollback-20261107T214947Z`. Ne pas relancer la rotation et ne pas modifier MariaDB.

La reprise commence à l'étape `auth-simple`, avec le nouveau commit, depuis une copie distincte de l'application en service :

```bash
bash deploy/preprod/preflight.sh <commit complet>
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple <commit complet>
```

Si le script signale une erreur, ne pas le relancer. La recette ci-dessous attend une autorisation séparée et un déploiement réussi.

## Recette après un démarrage réussi

Cette commande crée des comptes fictifs `781xxxxx`, fait valider un paiement manuel par l'administrateur de recette déjà existant, et ne marque aucun téléphone vérifié. Elle refuse de démarrer si le commit demandé n'est pas celui qui est réellement en service, ou s'il ne contient pas l'authentification simple. Un HTTP 404 est affiché avec sa méthode et sa route, sans corps de réponse.

```bash
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple-cycle <commit déployé>
```

Le mode `PHONE_VERIFICATION_REQUIRED=true` se vérifie sur la base de test locale, pas sur la préproduction. Sans fournisseur SMS, l'inscription répond HTTP 503 et aucun compte n'est créé.

## Retour arrière

Le script le fait seul si le build ou le démarrage échoue. La sauvegarde créée reste en place. L'ancienne sauvegarde `/var/backups/wagesse-preprod/rollback-20261107T214947Z` ne doit pas être supprimée.

Retour manuel, uniquement si le retour automatique n'a pas rétabli le service :

```bash
systemctl stop wagesse-preprod.service
runuser -u wagesse -- git -C /opt/wagesse-preprod/app checkout --detach "$(cat /var/backups/wagesse-preprod/rollback-auth-simple-*/commit)"
tar -C /opt/wagesse-preprod/app -xf /var/backups/wagesse-preprod/rollback-auth-simple-*/runtime.tar
cp -a /var/backups/wagesse-preprod/rollback-auth-simple-*/preprod.env /etc/wagesse/preprod.env
chmod 600 /etc/wagesse/preprod.env
systemctl start wagesse-preprod.service
```

Ne pas restaurer MariaDB pour un échec de ce déploiement. Ne pas relancer la rotation.
