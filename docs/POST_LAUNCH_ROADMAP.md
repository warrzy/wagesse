# Feuille de route après le lancement

Ces sujets ne bloquent pas la première version commerciale au Burkina Faso. La recherche, les filtres de ville, les devis et les notifications internes suffisent pour mettre en relation.

## Identité et canaux

- Magasin OTP partagé entre instances (aujourd’hui en mémoire du process).
- Contrat HTTP réel avec un agrégateur SMS burkinabè, une fois `SMS_HTTP_URL` et `SMS_HTTP_KEY` fournis hors Git.
- E-mail transactionnel seulement si le produit collecte une adresse réelle. L’adresse `{phone}@wagesse.local` ne doit pas servir de canal.
- Double authentification, colonnes déjà présentes.

## Mise en relation

- Score `Match` : distance, capacité, date, disponibilité. Le modèle existe, aucun service ne l’alimente.
- Filtres capacité, urgence et date dans `search()`.
- Plafonds du forfait (véhicules, demandes, devis) et consommation des boosts.
- File de signalements distincte du statut `DISPUTED`.

## Back-office encore en coquille

- Contenus, matériaux, promotions, rôles, types de camions.
- Recherche globale du bandeau.
- Rôle `OPERATOR` sans écran ni permissions.
- Extension du journal d’audit à toutes les mutations admin.
- Pages `/terms` et `/privacy` (liens de pied de page encore sans page).

## Preuves et après-vente

- Pièces jointes véhicule et documents S3.
- Preuve de livraison, notation, litige outillé, messagerie interne.
- Remboursement provider, persistance des webhooks, grand livre, commissions et reversements.

## Exploitation

- Pipeline d’intégration continue : lint, types, build, tests, Playwright avec MySQL.
- `Dockerfile` qui n’applique pas les migrations : `migrate deploy` reste une étape d’exploitation explicite.
- Supervision (Sentry est nommé et non branché), sauvegardes, domaine et HTTPS.
- Activation PayDunya uniquement après autorisation, clés hors Git, et recette sur le bac à sable PayDunya puis sur le mode live.
