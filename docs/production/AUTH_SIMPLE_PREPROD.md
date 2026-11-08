# Déploiement préproduction — authentification simple

Ce document ne lance aucun déploiement. La production n'est pas concernée. Les autres applications du VPS ne sont pas modifiées.

Le commit à déployer est celui de la branche `cursor/auth-simple-v1-ba0b`. Le site sert aujourd'hui `627cb4fc0fcd014e8743db2249b1887fe71dd173` tant que cette procédure n'a pas été autorisée.

## Effet

`deploy/preprod/apply-recette-fixes.sh` ajoute `PHONE_VERIFICATION_REQUIRED=false` s'il est absent. S'il existe avec une autre valeur, le script s'arrête et restaure la sauvegarde. La vérification fictive de préproduction reste indépendante et n'est pas élargie.

## Commandes, après autorisation

Depuis la copie des scripts mise à jour sur le commit de cette branche, sans relancer la rotation :

```bash
bash deploy/preprod/preflight.sh <commit complet>
WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh deploy <commit complet>
```

Ne pas exécuter ces commandes sur un domaine de production. Conserver `/var/backups/wagesse-preprod/rollback-20261107T214947Z`.

## Contrôle après démarrage

`GET /api/auth/phone-verification` doit répondre `required: false` et ne doit pas contenir de clé SMS. Une inscription de compte fictif ouvre le tableau de bord sans passer par `/auth/verify`. `phoneVerified` reste vide. Un achat de crédits crée une commande en attente, et les crédits n'apparaissent qu'après validation administrateur.
