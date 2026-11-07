# Sauvegardes et retour arrière

Contrôle du 6 novembre 2026, 19:50 (Europe/Paris).

## Sauvegardes existantes

Elles n’ont pas été vérifiées. SSH vers `147.79.118.212` est refusé, donc aucun cron, aucun dossier `/var/backups` et aucun dump déjà présent n’ont été lus. Il ne faut pas supposer qu’une sauvegarde d’ECOM-TOUCH existe tant qu’une session root ne l’a pas montrée.

## Ce que fera le script, une fois lancé

Avant d’ajouter le vhost :

- archive `/etc/nginx/sites-available` et `/etc/nginx/sites-enabled` dans `/var/backups/wagesse-preprod/nginx-<horodatage>.tgz`.

Si la base `wagesse_preprod` existe déjà lors d’une réinstallation :

- `mysqldump --single-transaction wagesse_preprod` compressé dans le même dossier, mode 600.

Le script ne sauvegarde pas les autres bases. Il ne lance pas `mysqldump --all-databases`, pour ne pas copier les données d’une autre application dans un fichier WAGESSE.

Après la première installation, prendre un dump de `wagesse_preprod` et le copier hors du VPS. Le dump du serveur seul ne protège pas d’une perte de disque.

## Retour arrière WAGESSE

Sans arrêter ECOM-TOUCH :

```bash
systemctl disable --now wagesse-preprod.service
rm /etc/nginx/sites-enabled/preprod.wagesse.fr
nginx -t && systemctl reload nginx
```

Ne pas utiliser `systemctl restart nginx`, `pm2 restart`, ni redémarrer PostgreSQL. Ne pas libérer les ports 3000, 3001 ou 3010.

Le certificat `/etc/letsencrypt/live/preprod.wagesse.fr` peut rester : il n’est plus servi. La base `wagesse_preprod` peut rester en place. La supprimer seulement après un dump conservé hors du serveur :

```bash
# après copie du dump
mysql -e "DROP DATABASE wagesse_preprod;"
```

Ne pas utiliser `DROP DATABASE` sur un autre nom. Ne pas lancer `prisma migrate reset`.

Pour revenir au code précédent :

```bash
git -C /opt/wagesse-preprod/app checkout <sha précédent>
systemctl restart wagesse-preprod.service
```

Les migrations déjà appliquées ne s’annulent pas toutes seules. Un retour de code qui exige l’ancien schéma demande une restauration du dump, pas une réécriture des fichiers de migration.

## Essai local déjà défait

La base `wagesse_seedcheck` a été créée sur la machine d’agent pour vérifier `migrate deploy` et le seed sans comptes de démonstration, puis supprimée. Elle n’existait pas sur le VPS.
