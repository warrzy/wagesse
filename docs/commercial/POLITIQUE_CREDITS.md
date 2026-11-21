# Politique de crédits

## Règle

Le client publie, consulte, accepte ou refuse un devis, puis suit la mission, sans crédit et sans abonnement.

Le transporteur consulte les demandes gratuitement. Envoyer un devis valide débite son portefeuille. Le coût est lu côté serveur dans le réglage `trucker.quoteCreditCost`. S’il n’est pas renseigné, le coût est de 1 crédit, soit le coût historique du déblocage. Le super administrateur peut le remplacer par un entier de 1 à 100. Une valeur envoyée par le navigateur n’est pas utilisée.

Les packs et les forfaits gardent les prix et les quantités du catalogue. Rien n’est inventé. Un forfait dont le prix est nul ou invalide n’entre pas dans une commande payante. Il est présenté comme gratuit.

## Achat

1. Le transporteur choisit une offre.
2. Une commande `PENDING` fige le prix et le nombre de crédits.
3. Aucun crédit n’est attribué.
4. Le super administrateur peut noter l’envoi des instructions, une référence de transaction et une note interne.
5. Le contact et le lien de paiement restent hors plateforme.
6. L’approbation crédite une seule fois, dans la même transaction que le passage au statut `APPROVED`.
7. Un refus ou une commande encore en attente n’attribue rien.
8. Un administrateur qui n’est pas super administrateur ne peut ni approuver, ni refuser, ni ajuster un portefeuille, ni s’attribuer le rôle de super administrateur. Le premier super administrateur est créé par une mise à jour directe du compte, hors de l’interface.

## Consommation

Le débit a lieu au moment où le devis est créé. Il est atomique avec la création du devis. La clé `quote:<utilisateur>:<demande>` empêche un second débit pour la même demande.

- Consulter une annonce ne débite rien.
- Modifier le prix d’un devis déjà envoyé ne débite rien.
- Un refus du client ne débite rien de plus.
- La création de la mission ne débite rien de plus.
- Retirer un devis ne rembourse pas : la proposition a déjà été transmise. Un remboursement exceptionnel passe par un ajustement du super administrateur, avec motif.

## Coordonnées

Les numéros et e-mails restent masqués sur les annonces. Le client voit le prix, le véhicule et le nom du transporteur sans payer. Le numéro du transporteur est transmis quand le devis est accepté. Le transporteur voit le numéro du client à ce même moment. Aucun crédit supplémentaire n’est demandé.
