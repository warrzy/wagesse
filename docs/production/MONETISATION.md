# Déploiement du modèle commercial

Non exécuté. La migration `20261121190000_quote_submission_credit` ajoute le rôle `SUPER_ADMIN` et la valeur `QUOTE_SUBMISSION` aux énumérations. Elle ne change pas les soldes existants.

La procédure de `docs/production/LANCEMENT_V1.md` s’applique. Le commit à installer est le sommet de cette branche, une fois le contrôle continu vert. Depuis la préproduction :

```bash
git fetch --no-tags origin <commit>
git checkout --detach <commit>
test "$(git rev-parse HEAD)" = "<commit>"
( cd deploy/preprod && sha256sum -c SHA256SUMS )
bash deploy/preprod/preflight.sh <commit>
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple <commit>
```

Le script sauvegarde l’application, refuse un schéma inattendu hors migration, applique les migrations et ne redémarre que `wagesse-preprod.service`. En cas d’échec du démarrage, il revient au commit précédent. Les autres sites du VPS ne sont pas concernés. La base de préproduction n’est pas copiée vers la production.

Après la première installation de production, le même commit se déploie avec :

```bash
WAGESSE_PRODUCTION_AUTHORIZE=yes bash deploy/production/deploy.sh <commit complet>
```

Le premier super administrateur n’existe pas encore dans l’énumération. Après la migration, une seule mise à jour SQL, hors interface, désigne le compte qui validera les règlements :

```sql
UPDATE User SET role = 'SUPER_ADMIN' WHERE phone = '<téléphone du responsable>';
```

Ensuite, seul ce rôle peut approuver une commande, ajuster un portefeuille ou nommer un autre super administrateur.

## Risques résiduels

- Les devis envoyés avant cette version n’ont pas été débités. Ils ne le sont pas rétroactivement.
- Le retrait d’un devis ne rend pas le crédit. Seul un ajustement du super administrateur peut le faire.
- Le coût par défaut reste 1 tant que `trucker.quoteCreditCost` n’est pas enregistré.
- Un administrateur qui n’est pas super administrateur voit les commandes mais ne peut plus les approuver.
- PayDunya et Orange Money restent hors du parcours manuel. Leurs routes ne sont pas activées par ce changement.
