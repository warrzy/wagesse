# Réactivation de l'envoi SMTP

Aucun message n'est envoyé par e-mail dans WAGESSE V1. `lib/mail.ts` reste le seul point d'envoi. Il ne simule pas un message, en production comme en préproduction.

## Canal de récupération

`ACCOUNT_RECOVERY_CHANNEL` accepte trois valeurs :

- `admin`, valeur de lancement. La page « Mot de passe oublié » enregistre une demande d'assistance. La réponse est la même que le compte existe ou non.
- `smtp`. Le même enregistrement a lieu. `sendAccountEmail` n'est appelé que si le compte existe et que le SMTP est réellement configuré. La réponse publique ne change pas et ne contient pas de mot de passe.
- `sms`. Les routes OTP déjà présentes reprennent le parcours par code. Voir `docs/security/REACTIVATION_SMS.md`.

Changer cette variable ne demande pas de réécrire l'authentification, les sessions ni la réinitialisation administrateur.

## Activation

Poser toutes les valeurs suivantes dans le fichier d'environnement, en mode 600, sans les écrire dans un journal :

```bash
ACCOUNT_RECOVERY_CHANNEL=smtp
SMTP_ENABLED=true
SMTP_HOST=smtp.exemple
SMTP_PORT=587
SMTP_USER=wagesse
SMTP_PASSWORD=secret
SMTP_FROM=nepasrepondre@exemple
```

`SMTP_ENABLED=true` sans hôte, port, identifiant, mot de passe ou expéditeur laisse `smtpConfigured()` à faux. `SMTP_ALLOW_SIMULATE` ne provoque aucun envoi. Le brancher un transport réel se fait dans `sendAccountEmail`, qui refuse aujourd'hui de livrer tant que ce transport n'est pas ajouté.

Ne pas définir `OTP_DEBUG_RETURN` ni `SMS_ALLOW_SIMULATE` pour compenser l'absence de SMTP.
