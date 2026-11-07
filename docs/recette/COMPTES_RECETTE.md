# Registre des comptes de recette

Ces comptes ont été créés le 7 novembre 2026 sur https://preprod.wagesse.fr. Les données portent le préfixe « Recette ». Les mots de passe ne figurent pas dans ce fichier.

| Référence | Rôle | Téléphone | Nom affiché |
| --- | --- | --- | --- |
| client-a | CLIENT | 78001021 | Recette ClienteA |
| client-b | CLIENT | 78001022 | Recette ClienteB |
| trucker-a | TRUCKER | 78002021 | Recette TransporteurA |
| trucker-b | TRUCKER | 78002022 | Recette TransporteurB |
| admin-recette | ADMIN | 78003021 | Recette Admin |

L'administrateur déjà présent sur le serveur n'est pas modifié. Le compte `admin-recette` n'existe qu'après l'exécution autorisée de `deploy/preprod/rotate-recette-secrets.sh`. L'inscription publique reste limitée à CLIENT et TRUCKER.

Le fichier chiffré qui était dans Git et dans le dossier de `wagesse-deploy` est retiré. Il avait été conservé à côté de sa phrase secrète, donc les quatre mots de passe d'origine sont considérés comme exposés. Le script root les remplace, crée l'administrateur de recette s'il est absent, et écrit le nouveau registre uniquement dans `/etc/wagesse/recette-accounts.enc` (root, mode 600). La nouvelle phrase secrète est écrite uniquement dans `/root/wagesse-recette.passphrase`. Elle n'est pas affichée, ni écrite à côté du registre, ni dans Git, ni dans ce document.

Ce script n'a pas encore été lancé : il exige l'autorisation explicite du propriétaire.
