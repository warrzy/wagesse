# Registre des comptes de recette

Ces comptes ont été créés le 7 novembre 2026 sur https://preprod.wagesse.fr. Les données portent le préfixe « Recette ». Les mots de passe ne figurent pas dans ce fichier.

| Référence | Rôle | Téléphone | Nom affiché | Connexion | Secret |
| --- | --- | --- | --- | --- | --- |
| client-a | CLIENT | 78001021 | Recette ClienteA | https://preprod.wagesse.fr/auth/login | comptes-recette.enc |
| client-b | CLIENT | 78001022 | Recette ClienteB | https://preprod.wagesse.fr/auth/login | comptes-recette.enc |
| trucker-a | TRUCKER | 78002021 | Recette TransporteurA | https://preprod.wagesse.fr/auth/login | comptes-recette.enc |
| trucker-b | TRUCKER | 78002022 | Recette TransporteurB | https://preprod.wagesse.fr/auth/login | comptes-recette.enc |

L'administrateur déjà présent sur le serveur n'a pas été modifié. Aucun second administrateur n'a pu être créé : l'inscription publique n'accepte que CLIENT et TRUCKER.

Le fichier `docs/recette/comptes-recette.enc` est chiffré en AES-256-CBC, PBKDF2, 200 000 itérations. Une copie et la phrase secrète sont sur le VPS, lisibles seulement par `wagesse-deploy` :

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in comptes-recette.enc -pass file:wagesse-recette.passphrase
```

La phrase secrète est remise au propriétaire en dehors de ce document et n'est pas dans Git.
