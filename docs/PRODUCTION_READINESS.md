# Préparation à la recette de préproduction

État au 6 novembre 2026 (Europe/Paris), branche `cursor/phase3-launch-readiness-ba0b`.

Cette version est prête pour une recette de préproduction. Elle n’est pas autorisée au déploiement en production.

## Ce qui est exploitable

- Inscription client et camionneur, connexion, vérification par code, récupération de mot de passe.
- Profils, demandes, recherche par ville, devis, déblocage de contact, missions avec transitions contrôlées.
- Paiement manuel : commande, attente, approbation ou refus, attribution unique des crédits ou du forfait.
- Administration : comptes, blocage, vérification transporteur, annonces, devis, missions, commandes, crédits, forfaits, tarifs, journal, notifications, paramètres.
- Notifications internes des événements commerciaux essentiels.
- PayDunya présent et inactif. Aucun paiement réel n’est déclenché.

## Réglages à fournir hors Git avant une préproduction avec de vrais SMS

```
PAYMENT_MODE=MANUAL
PAYDUNYA_ENABLED=false
JWT_SECRET=<secret long, obligatoire en production>
SMS_PROVIDER=http
SMS_HTTP_URL=<endpoint de l’agrégateur>
SMS_HTTP_KEY=<clé>
SMS_SENDER=WAGESSE
SMS_COUNTRY_CODE=226
OTP_DEBUG_RETURN=
SMS_ALLOW_SIMULATE=
```

Sans URL ni clé, l’inscription crée le compte et `issueOtp` répond `delivered: false`. L’utilisateur voit que le SMS n’est pas parti et peut renvoyer le code. Aucun code n’est écrit dans les logs.

La simulation (`SMS_PROVIDER=simulate`) sert aux tests. Elle est fermée quand `NODE_ENV=production`, sauf `SMS_ALLOW_SIMULATE=true` réservé à une recette isolée.

## Base de données

Ne pas réécrire les migrations déjà appliquées. Les checksums de la phase 2 ont changé la casse des identifiants : une base qui a appliqué les anciens fichiers doit être réconciliée avec `prisma migrate resolve`, pas avec un reset. La phase 3 n’ajoute aucune migration.

`npx prisma migrate deploy` reste la commande d’application. Ne pas utiliser `migrate reset` sur une base qui contient des données.

## Limites à accepter pour la recette

- OTP en mémoire : un redémarrage efface les codes non consommés.
- Une seule instance applicative tant que l’OTP n’est pas externalisé.
- Pas de score de matching automatique.
- Cinq écrans admin restent des coquilles (contenus, matériaux, promotions, rôles, types de camions).
- Pas de pièces jointes, pas de messagerie, pas de preuve de livraison.
- Pied de page : `/terms` et `/privacy` n’ont pas de page.
- Recherche globale admin non branchée.
- Pas de pipeline CI.

## Interdits tant qu’une autorisation explicite n’est pas donnée

- Déploiement en production.
- Fusion dans `main`.
- Appel PayDunya réel ou `PAYDUNYA_ENABLED=true` sur un environnement exposé.
- Migration destructive.
- Secret dans Git.
