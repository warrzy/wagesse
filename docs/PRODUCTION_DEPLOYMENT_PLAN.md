# Plan de mise en production — non exécuté

`wagesse.fr` n’est pas basculé. Aucune validation explicite n’a été donnée, et la préproduction n’est pas encore en service.

## État actuel de la production

| Nom | Destination observée | Action |
| --- | --- | --- |
| `wagesse.fr` | `213.255.195.59` (LWS) | Laisser |
| `www.wagesse.fr` | `213.255.195.59` | Laisser |
| MX et `mail.wagesse.fr` | `213.255.195.52`, priorité 10 | Ne pas modifier |
| SPF | LWS et `mail.wagesse.fr` | Ne pas modifier |
| `preprod.wagesse.fr` | `147.79.118.212` | Seul nom concerné par WAGESSE |

Le VPS héberge déjà ECOM-TOUCH. La production WAGESSE, le jour où elle sera autorisée, devra avoir son propre vhost, son propre certificat et sa propre base, sur le même principe que la préproduction.

## Conditions avant de toucher `wagesse.fr`

1. https://preprod.wagesse.fr sert WAGESSE avec un certificat valide pour ce nom.
2. https://ecom-touch.tech répond toujours après l’ajout du vhost.
3. Recette des parcours client, camionneur et administrateur sur l’URL de préproduction.
4. Commande manuelle approuvée une seule fois, crédits cohérents, contacts masqués avant déblocage.
5. SMS réel configuré, ou décision écrite d’ouvrir la préproduction sans envoi de code.
6. Sauvegarde restaurable de la base de préproduction.
7. Validation explicite pour changer l’enregistrement A de `wagesse.fr`.

## Bascule, une fois ces conditions réunies

- Nouveau répertoire, nouvelle base, nouveau service systemd, nouveau `server_name`.
- `PAYMENT_MODE=MANUAL`, PayDunya non activé, pas de bac à sable, pas de simulation SMS publique.
- Certificat Let’s Encrypt pour les seuls noms autorisés.
- Conserver les enregistrements MX, SPF et `mail.wagesse.fr`.
- Changer l’enregistrement A seulement après le certificat et le vhost, afin d’éviter de publier le site par défaut du VPS.
- Garder la préproduction en place pour comparer.

## Retour arrière de la production

Remettre l’enregistrement A de `wagesse.fr` vers `213.255.195.59`. Le TTL observé n’a pas été figé ici ; le prévoir avant le changement. Ne pas supprimer la base de production tant qu’une sauvegarde n’a pas été copiée hors du serveur.
