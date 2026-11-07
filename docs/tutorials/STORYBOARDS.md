# Tutoriels

Quatre vidéos MP4 ont été enregistrées le 7 novembre 2026 sur https://preprod.wagesse.fr avec Chromium. Les sous-titres français sont incrustés dans l'image. Aucun mot de passe n'est lisible : le champ est masqué. Les comptes sont les comptes de recette.

| Fichier | Durée | Contenu |
| --- | --- | --- |
| presentation-generale.mp4 | 12 s | Accueil, tarifs, contact, page 404 |
| tutoriel-connexion.mp4 | 25 s | Connexion, arrivée sur la vérification SMS, formulaire d'inscription |
| tutoriel-client.mp4 | 22 s | Tableau de bord, demandes, formulaire, profil, contacts, commandes, achat |
| tutoriel-transporteur.mp4 | 16 s | Tableau de bord, véhicule, demandes disponibles, profil, refus de l'admin |

## Scènes non tournées

### Administration

1. Ouvrir la connexion avec un administrateur distinct de l'administrateur initial.
2. Lire le tableau de bord.
3. Ouvrir la commande manuelle créée par un client.
4. La valider, puis montrer le solde du client.
5. Refuser une seconde commande et montrer que le solde ne change pas.
6. Rejouer la validation de la première commande et montrer qu'aucun second crédit n'est ajouté.

Cette scène n'a pas été tournée : le mot de passe de l'administrateur existant n'a pas été lu et aucun administrateur de recette n'a été créé.

### Mission complète

1. Le client publie une demande.
2. Deux transporteurs envoient un devis.
3. Le client débloque les contacts après vérification du numéro.
4. Il accepte un devis. Une mission apparaît.
5. Il refuse l'autre, ou le second passe à l'état rejeté.

La publication et les devis ont été exécutés par l'API. L'acceptation s'est arrêtée au déblocage du contact, parce que le SMS n'est pas délivré. La vidéo de mission complète n'a donc pas été enregistrée.

### Achat validé

La page d'achat a été filmée dans `tutoriel-client.mp4`. La confirmation a été refusée avec le message de numéro non vérifié. La suite, validation par un administrateur, n'a pas été filmée.
