# Déploiement isolé du modèle commercial

Décision préparée, non exécutée. La production, la base commerciale et les autres applications du VPS ne sont pas modifiées. Aucun règlement réel n'est demandé.

Le commit à installer est le sommet qui contient la pull request #11 et les compléments d'accès, une fois son contrôle continu vert. Il doit contenir le logo `7a2a9719cddf354bb66914107b53c748f92bffda`, l'authentification simple `d01574087fcbf740e7d9bd5ea4f715a32f7ed113`, la migration de crédits `47b47f7994fd4ea5a52c61a267883e4c4b9f72b5a9632a75aa7c2df3720a37c8`, et la migration d'accès `4fa3db1c17eb10549bc1069a5cd9e694e60bbbe2bee0a3ae0b2581451f8bb70a`. Le parcours, les permissions et le retour arrière des colonnes de session sont dans `docs/security/ACCES_COMPTES.md`.

`deploy/preprod/deploy-auth-simple.sh` refuse ce commit, parce qu'il modifie Prisma. Ne pas l'utiliser. Ne pas lancer `deploy/production/deploy.sh` : la production n'est pas ouverte.

## Contrôle de la migration

La migration `20261121190000_quote_submission_credit` ajoute une valeur à la fin de trois énumérations déjà présentes :

- `User.role` et `RolePermission.role` : `SUPER_ADMIN` après `ADMIN`.
- `CreditTransaction.type` : `QUOTE_SUBMISSION` après `PROMO`.

Les valeurs déjà stockées restent lisibles. Les soldes, commandes et devis ne sont pas réécrits. Une répétition de la migration par `prisma migrate deploy` ne la réapplique pas.

Reprise de l'énumération, seulement si aucune ligne n'utilise encore `SUPER_ADMIN` ni `QUOTE_SUBMISSION` :

```sql
ALTER TABLE `CreditTransaction` MODIFY `type` ENUM('PURCHASE', 'UNLOCK_CONTACT', 'SUBSCRIPTION_MONTHLY_TOPUP', 'ADMIN_ADJUSTMENT', 'PROMO') NOT NULL;
ALTER TABLE `RolePermission` MODIFY `role` ENUM('VISITOR', 'CLIENT', 'TRUCKER', 'OPERATOR', 'ADMIN') NOT NULL;
ALTER TABLE `User` MODIFY `role` ENUM('VISITOR', 'CLIENT', 'TRUCKER', 'OPERATOR', 'ADMIN') NOT NULL DEFAULT 'CLIENT';
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261121190000_quote_submission_credit';
```

Si une ligne utilise déjà une nouvelle valeur, ne pas exécuter ces `ALTER`. Restaurer le dump contrôlé, avec une autorisation séparée.

## Préproduction

Depuis `/root/wagesse-preprod-src`, après lecture du commit complet `<commit>` :

```bash
git fetch --no-tags origin <commit>
git checkout --detach <commit>
test "$(git rev-parse HEAD)" = "<commit>"
( cd deploy/preprod && sha256sum -c SHA256SUMS )
bash deploy/preprod/preflight.sh <commit>
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh monetisation <commit>
```

Le script refuse une autre base que `wagesse_preprod`, un `PAYMENT_MODE` autre que `MANUAL`, et une migration dont le contenu diffère. Il sauvegarde l'application, copie `wagesse_preprod` dans une base temporaire, compare les tables `User`, `TransportRequest`, `Quote`, `CommercialOrder`, `CreditWallet`, `Mission` et `AuditLog`, supprime seulement cette base temporaire, puis applique la migration. Il ne redémarre que `wagesse-preprod.service`, qui reste sur `127.0.0.1:3020`.

En cas d'échec avant la migration, l'application en service n'est pas changée. En cas d'échec après, les fichiers reviennent au commit précédent. La base n'est pas restaurée automatiquement. Le dump reste dans `/var/backups/wagesse-preprod/rollback-monetisation-<horodatage>/wagesse_preprod.sql.gz`.

Retour manuel de l'application, si le script s'est arrêté après avoir changé les fichiers :

```bash
systemctl stop wagesse-preprod.service
runuser -u wagesse -- env -i HOME=/opt/wagesse-preprod PATH=/usr/bin:/bin GIT_TERMINAL_PROMPT=0 \
  git -C /opt/wagesse-preprod/app checkout --detach "$(cat /var/backups/wagesse-preprod/rollback-monetisation-<horodatage>/commit)"
tar -C /opt/wagesse-preprod/app -xf /var/backups/wagesse-preprod/rollback-monetisation-<horodatage>/runtime.tar
cp -a /var/backups/wagesse-preprod/rollback-monetisation-<horodatage>/preprod.env /etc/wagesse/preprod.env
chmod 600 /etc/wagesse/preprod.env
systemctl start wagesse-preprod.service
```

Retour de la base, seulement avec une autorisation distincte, et jamais par `DROP DATABASE` sur une autre base :

```bash
mysql -e "CREATE DATABASE wagesse_preprod_rollback CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
gunzip -c /var/backups/wagesse-preprod/rollback-monetisation-<horodatage>/wagesse_preprod.sql.gz | mysql wagesse_preprod_rollback
# Comparer les comptes, puis remplacer uniquement wagesse_preprod.
mysql -e "DROP DATABASE wagesse_preprod"
mysql -e "CREATE DATABASE wagesse_preprod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
gunzip -c /var/backups/wagesse-preprod/rollback-monetisation-<horodatage>/wagesse_preprod.sql.gz | mysql wagesse_preprod
mysql -e "DROP DATABASE wagesse_preprod_rollback"
```

Les droits de l'utilisateur applicatif portent sur `wagesse_preprod`. Les recréer s'ils ont suivi la suppression de cette base, sans ouvrir un droit sur une autre base.

## Premier super administrateur

Aucun compte n'est promu par le déploiement. Après la migration, relever les administrateurs sans rien écrire :

```sql
SELECT phone, role, status FROM User
WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND deletedAt IS NULL
ORDER BY phone;
```

Puis, avec le téléphone d'un administrateur actif déjà existant :

```bash
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh super-admin <telephone>
```

Le script ne modifie qu'une ligne `ADMIN` active, refuse s'il existe déjà un `SUPER_ADMIN`, et vérifie que les autres téléphones administrateurs sont identiques avant et après. L'inscription, un jeton falsifié et un administrateur ne peuvent pas obtenir ce rôle par l'API.

## Recette sur la préproduction

Aucun paiement réel. La référence de transaction est un libellé de recette.

1. Créer un client et publier une demande. Aucun portefeuille n'est créé.
2. Créer un transporteur, consulter la demande, puis tenter un devis. La réponse est HTTP 402 et le solde reste vide.
3. Acheter un pack du catalogue. La commande est `PENDING`, avec le prix et les crédits du catalogue. Le portefeuille reste vide.
4. Le super administrateur enregistre une référence `RECETTE-PREPROD` et approuve. Une seule transaction `PURCHASE` apparaît.
5. Relancer l'approbation. Aucune seconde transaction.
6. Le transporteur envoie un devis. Une seule transaction `QUOTE_SUBMISSION` est créée et le solde baisse du coût serveur.
7. Un second devis sur la même demande ne débite pas une seconde fois.
8. Refuser une autre commande. Le solde ne change pas.
9. Contrôler que `https://ecom-touch.tech/`, `https://preprod.ecomschool.fr/`, `https://wendyam-finance.com/` et `https://tme-machinery.com/` répondent encore.

## Échec du 23 novembre 2026 et reprise

Le déploiement de `1cbf41b36aef2d69a42a76301e0f7a0a83fe9c99` s'est arrêté à l'étape `migration`. Le service est revenu à `7a2a9719cddf354bb66914107b53c748f92bffda`. Le script lançait `prisma migrate` avec le `node_modules` déjà installé, avant `npm ci`, puis masquait la cause derrière un échec générique. Sur MariaDB 10.11.14, les deux SQL s'appliquent dans l'ordre lorsque le compte possède `ALTER`, `CREATE` et `INDEX`. Un compte limité au DML s'arrête sur `P3018` / erreur `1142` et peut laisser une ligne non terminée dans `_prisma_migrations`, sans ajouter les colonnes.

Avant toute reprise, lecture seule sur `wagesse_preprod` :

```sql
SELECT migration_name, started_at, finished_at, rolled_back_at
FROM _prisma_migrations
ORDER BY started_at;
SELECT COLUMN_NAME FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'wagesse_preprod' AND TABLE_NAME = 'User'
  AND COLUMN_NAME IN ('tokenVersion', 'passwordMustChange', 'temporaryPasswordExpiresAt');
```

Ne pas restaurer le dump si ces colonnes sont absentes et qu'aucune ligne nouvelle n'est terminée : la base n'a pas reçu la migration, et un dump écraserait les écritures faites depuis la sauvegarde. Ne pas supprimer `wagesse_preprod`. Le correctif installe les dépendances, fait le typecheck, contrôle les privilèges sans les afficher, puis migre. S'il trouve une ligne non terminée sans changement de schéma, il annule seulement cette ligne du journal Prisma et rejoue la migration. Il ne rend pas les crédits et ne change aucun rôle.

## Décision

Conditionnel pour la préproduction : le parcours est prêt, mais il attend l'autorisation explicite `WAGESSE_PREPROD_AUTHORIZE=yes` et le téléphone de l'administrateur à promouvoir.

NO-GO pour la production. La première base commerciale indépendante sera préparée ensuite, sans importer `wagesse_preprod`.
