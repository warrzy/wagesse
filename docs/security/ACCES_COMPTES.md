# Accès aux comptes et coordonnées

Ce document complète le modèle commercial. Il ne déclenche aucun déploiement.

## Matrice

| Action | Visiteur | Client | Transporteur sans crédit | Transporteur avec crédit | Devis refusé | Parties d'un devis accepté ou d'une mission | Admin | Super admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consulter une annonce publiée | non | ses annonces | oui | oui | oui | oui | oui | oui |
| Voir le numéro ou l'e-mail du client | non | les siens | masqué | masqué | masqué | oui, les deux parties | masqué avant acceptation | masqué avant acceptation |
| Envoyer un devis | non | non | refusé, solde insuffisant | oui, débit du portefeuille | déjà traité | déjà traité | non | non |
| Réinitialiser un mot de passe | non | non | non | non | non | non | clients, transporteurs, opérateurs et admins | tous, avec une phrase séparée pour un super admin |
| Réinitialiser un super admin | non | non | non | non | non | non | refusé | oui, phrase `REINITIALISER-SUPER-ADMIN` |

Un ancien déblocage de contact ne révèle plus les coordonnées. Les routes de consultation, de devis, de profil, de contacts et de missions appliquent la même règle. Le profil renvoie seulement le compte de l'appelant.

## Parcours de récupération

1. La personne ouvre « Mot de passe oublié » et indique son téléphone ou son e-mail.
2. La réponse est neutre. Elle ne dit pas si le compte existe. Aucun SMS ni e-mail n'est envoyé lorsque le canal vaut `admin`.
3. Un administrateur habilité recherche le compte, lit son rôle et son statut, puis consigne le contrôle d'identité fait hors plateforme.
4. S'il a un doute, il ne confirme pas. L'interface et l'API refusent l'opération.
5. La confirmation crée un mot de passe temporaire de 16 caractères, valable 30 minutes, à usage limité par le verrouillage après cinq échecs.
6. L'administrateur le communique par un canal déjà vérifié. Il n'est pas stocké dans le journal d'audit ni affiché une seconde fois.
7. La première connexion n'ouvre pas l'application. Elle impose le choix d'un nouveau mot de passe. Les sessions et jetons précédents sont déjà invalides, puis le jeton de changement l'est aussi.

Les routes OTP et le futur envoi SMTP restent en place. Le canal se choisit avec `ACCOUNT_RECOVERY_CHANNEL`. La valeur de lancement est `admin`.

## API et interfaces

- `POST /api/auth/login` accepte `phone` ou `identifier`, avec le mot de passe. Un e-mail est comparé seulement aux e-mails. Un téléphone est comparé seulement aux téléphones. Si les formes locale et internationale désignent deux comptes, la connexion est refusée.
- `POST /api/auth/signup` garde l'e-mail facultatif. Sans e-mail, l'adresse interne `numéro@wagesse.local` est conservée.
- `POST /api/auth/forgot-password` enregistre une demande d'assistance, ou émet un OTP si le canal est `sms`.
- `GET /api/auth/recovery-policy` indique le canal, sans secret.
- `POST /api/auth/change-password` n'accepte que le jeton de changement.
- `GET` et `POST /api/admin/mots-de-passe` recherchent puis réinitialisent. Le mot de passe temporaire figure dans cette seule réponse HTTP.
- Les pages concernées sont `/auth/login`, `/auth/forgot`, `/auth/changer-mot-de-passe` et `/admin/mots-de-passe`.

Le hachage bcrypt des mots de passe n'est pas modifié. `PHONE_VERIFICATION_REQUIRED=false` reste le mode de lancement.

## Migration

`prisma/migrations/20261123160000_account_access/migration.sql` ajoute `User.tokenVersion`, `User.passwordMustChange`, `User.temporaryPasswordExpiresAt` et la table `PasswordAssistanceRequest`. Elle ne réécrit aucun mot de passe. Empreinte : `4fa3db1c17eb10549bc1069a5cd9e694e60bbbe2bee0a3ae0b2581451f8bb70a`.

Le script `deploy/preprod/deploy-monetisation.sh` accepte cette migration en plus de `20261121190000_quote_submission_credit`. Il refuse toute autre migration. Il n'est pas lancé par ce changement.

## Déploiement et retour arrière

Ne pas exécuter ces commandes sans l'autorisation `WAGESSE_PREPROD_AUTHORIZE=yes`. Ne pas viser la production, ne pas lancer `deploy/production/deploy.sh`, et ne pas utiliser `deploy-auth-simple.sh` : il refuse un changement Prisma.

Depuis `/root/wagesse-preprod-src`, après lecture du commit complet `<commit>` :

```bash
git fetch --no-tags origin <commit>
git checkout --detach <commit>
test "$(git rev-parse HEAD)" = "<commit>"
( cd deploy/preprod && sha256sum -c SHA256SUMS )
bash deploy/preprod/preflight.sh <commit>
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh monetisation <commit>
```

Le script sauvegarde l'application, contrôle le dump de `wagesse_preprod`, ne redémarre que `wagesse-preprod.service` sur `127.0.0.1:3020`, puis relit les autres sites sans les modifier. En cas d'échec avant le changement de fichiers, l'application en service reste en place. Après le changement, les fichiers reviennent au commit précédent. La base n'est pas restaurée automatiquement. Le dump reste dans `/var/backups/wagesse-preprod/rollback-monetisation-<horodatage>/`.

Retour des fichiers, si le script s'est arrêté après les avoir changés :

```bash
systemctl stop wagesse-preprod.service
runuser -u wagesse -- env -i HOME=/opt/wagesse-preprod PATH=/usr/bin:/bin GIT_TERMINAL_PROMPT=0 \
  git -C /opt/wagesse-preprod/app checkout --detach "$(cat /var/backups/wagesse-preprod/rollback-monetisation-<horodatage>/commit)"
tar -C /opt/wagesse-preprod/app -xf /var/backups/wagesse-preprod/rollback-monetisation-<horodatage>/runtime.tar
cp -a /var/backups/wagesse-preprod/rollback-monetisation-<horodatage>/preprod.env /etc/wagesse/preprod.env
chmod 600 /etc/wagesse/preprod.env
systemctl start wagesse-preprod.service
```

Retour de la base, seulement avec une autorisation distincte. Si la migration d'accès est la seule nouveauté et qu'aucune réinitialisation n'a eu lieu, les colonnes peuvent être retirées :

```sql
DROP TABLE IF EXISTS `PasswordAssistanceRequest`;
ALTER TABLE `User` DROP COLUMN `temporaryPasswordExpiresAt`;
ALTER TABLE `User` DROP COLUMN `passwordMustChange`;
ALTER TABLE `User` DROP COLUMN `tokenVersion`;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261123160000_account_access';
```

Si des sessions ont déjà été invalidées, ne pas retirer ces colonnes : restaurer le dump contrôlé à la place, uniquement sur `wagesse_preprod`, selon la procédure de `docs/production/MONETISATION.md`.
