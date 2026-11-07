# Matrice de recette WAGESSE

Les lignes ci-dessous sont la campagne 1, sur le commit `91e8235de45f3dfd58be558dc4636147d2a7d8df`. La campagne 3, le 7 novembre 2026 au soir (Europe/Paris), a déployé `627cb4fc0fcd014e8743db2249b1887fe71dd173`. Elle a fait passer SEC-HDR, UI-LOGIN, ADM-AUTH, ADM-DASH, BKP, MIS-ACC, PAY-CYCLE, LEG-PRIV et LEG-TERMS. Le détail comparé est dans `RAPPORT_RECETTE_FINAL.html`.

Environnement de la campagne 1, le 7 novembre 2026, 19:50 (Europe/Paris) : https://preprod.wagesse.fr, certificat `preprod.wagesse.fr`, code déployé `91e8235de45f3dfd58be558dc4636147d2a7d8df`, paiement manuel.

Scénarios : 80. PASS 67. FAIL 2. BLOCKED 6. NOT IMPLEMENTED 5. Taux de réussite des scénarios conclusifs : 97.1 % (67/69).

| ID | Fonctionnalité | Profil | Statut | Attendu | Observé |
| --- | --- | --- | --- | --- | --- |
| ADM-CLIENT | Tableau de bord admin avec un client | client | PASS | refus | HTTP 401 Forbidden |
| ADM-NOAUTH | Tableau de bord admin sans jeton | anonyme | PASS | HTTP 401 | HTTP 401 Unauthorized |
| ADM-TRUCKER | Liste utilisateurs avec un transporteur | trucker | PASS | refus | HTTP 401 Forbidden |
| AUTH-BAD | Mot de passe incorrect | client | PASS | HTTP 401 | HTTP 401 Identifiants incorrects |
| AUTH-FORGOT | Mot de passe oublié | client | PASS | Limite de renvoi, puis réponse générique sans code | HTTP 429 dans la minute qui suit l'OTP d'inscription. Après 65 secondes : HTTP 200, smsDelivered false, aucun code dans la réponse. |
| AUTH-ME | Session courante | client | PASS | rôle CLIENT | HTTP 200  status=ACTIVE id=cmw6rb2vy0003lbwxy7j18lsc role=CLIENT |
| AUTH-RESET | Réinitialisation avec un code faux | client | PASS | refus | HTTP 400 Code invalide ou expiré |
| AUTH-ROLE | Refus du rôle admin à l'inscription | visiteur | PASS | HTTP 400 | HTTP 400 Invalid option: expected one of "CLIENT"/"TRUCKER" |
| AUTH-STILL | Mot de passe inchangé après faux code | client | PASS | connexion encore possible | HTTP 200 Connexion réussie |
| AUTH-VAL | Validation inscription | visiteur | PASS | HTTP 400 | HTTP 400 Numéro de téléphone invalide |
| CONT | Contacts client | client | PASS | HTTP 200 | HTTP 200 |
| CRD-BAL | Solde de crédits | client | PASS | solde lisible | HTTP 200 data_keys=['balance', 'purchased', 'subscription', 'subscriptionExpiresAt'] |
| CRD-PHONE | Achat de crédits sans téléphone vérifié | client | PASS | HTTP 403, aucun crédit | HTTP 403 Vérifiez votre numéro de téléphone avant cette opération. |
| LOGIN-client-a | Connexion client-a | CLIENT | PASS | 200 et téléphone non vérifié | HTTP 200 Connexion réussie verified=None |
| LOGIN-client-b | Connexion client-b | CLIENT | PASS | 200 et téléphone non vérifié | HTTP 200 Connexion réussie verified=None |
| LOGIN-trucker-a | Connexion trucker-a | TRUCKER | PASS | 200 et téléphone non vérifié | HTTP 200 Connexion réussie verified=None |
| LOGIN-trucker-b | Connexion trucker-b | TRUCKER | PASS | 200 et téléphone non vérifié | HTTP 200 Connexion réussie verified=None |
| PAGE/ | Page / | visiteur | PASS | HTTP attendu selon la page | HTTP 200 titre=Wagesse - Marketplace de Fret Burkina Faso octets=85390 |
| PAGE/abonnement | Page /abonnement | visiteur | PASS | HTTP attendu selon la page | HTTP 200 titre=Wagesse - Marketplace de Fret Burkina Faso octets=15214 |
| PAGE/admin | Page /admin | visiteur | PASS | HTTP attendu selon la page | HTTP 200 titre=Wagesse - Marketplace de Fret Burkina Faso octets=8353 |
| PAGE/auth/forgot | Page /auth/forgot | visiteur | PASS | HTTP attendu selon la page | HTTP 200 titre=Wagesse - Marketplace de Fret Burkina Faso octets=15942 |
| PAGE/auth/login | Page /auth/login | visiteur | PASS | HTTP attendu selon la page | HTTP 200 titre=Wagesse - Marketplace de Fret Burkina Faso octets=16608 |
| PAGE/auth/signup | Page /auth/signup | visiteur | PASS | HTTP attendu selon la page | HTTP 200 titre=Wagesse - Marketplace de Fret Burkina Faso octets=8062 |
| PAGE/cette-page-n-existe-pas | Page /cette-page-n-existe-pas | visiteur | PASS | réponse HTTP | HTTP 404 octets=8723 |
| PAGE/contact | Page /contact | visiteur | PASS | HTTP attendu selon la page | HTTP 200 titre=Wagesse - Marketplace de Fret Burkina Faso octets=16232 |
| PAGE/dashboard/client | Page /dashboard/client | visiteur | PASS | HTTP attendu selon la page | HTTP 200 titre=Wagesse - Marketplace de Fret Burkina Faso octets=23712 |
| PAGE/pricing | Page /pricing | visiteur | PASS | HTTP attendu selon la page | HTTP 200 titre=Wagesse - Marketplace de Fret Burkina Faso octets=35045 |
| PAY-MODE | Mode de paiement | public | PASS | MANUAL | HTTP 200  mode=MANUAL |
| PAY-PACKS | Catalogue de packs | public | PASS | liste non vide | HTTP 200 count=4 |
| PAY-WEBHOOK | Webhook PayDunya forgé | public | PASS | 401 ou 403 | HTTP 403 PayDunya désactivé |
| PROF-C | Lecture profil client | client | PASS | HTTP 200 | HTTP 200  id=cmw6rb2w00005lbwxsnqmpcjh |
| PROF-C-UPD | Mise à jour profil client | client | PASS | HTTP 200 | HTTP 200  id=cmw6rb2w00005lbwxsnqmpcjh |
| PROF-ISO | Profil client demandé par un transporteur | trucker | PASS | refus | HTTP 404 Customer profile not found |
| PROF-T | Mise à jour profil transporteur | trucker | PASS | HTTP 200 | HTTP 200  id=cmw6rb3go000blbwx7107ggc2 |
| QUO-A | Proposition de devis | trucker | PASS | HTTP 201 | HTTP 201  status=PENDING id=cmw6rb8wy000tlbwxui588oqq |
| QUO-ACC | Acceptation sans déblocage de contact | client | PASS | HTTP 402, aucune mission créée | HTTP 402 You must unlock the quotes on this request before accepting one |
| QUO-B | Second devis | trucker | PASS | HTTP 201 | HTTP 201  status=PENDING id=cmw6rb94g000xlbwxp7od7ass |
| QUO-DUP | Second devis du même transporteur | trucker | PASS | refus du doublon | HTTP 400 You have already quoted on this request |
| QUO-IDOR | Refus d'un devis par un autre client | client | PASS | refus | HTTP 403 Unauthorized |
| QUO-MASK | Devis visibles avec contacts masqués | client | PASS | devis sans numéro de transporteur | HTTP 200 count=2 phone_leak=False |
| QUO-REJ | Refus d'un devis par le client propriétaire | client | PASS | HTTP 200 | HTTP 200  status=REJECTED id=cmw6rb94g000xlbwxp7od7ass |
| QUO-WD | Retrait du devis restant | trucker | PASS | HTTP 200 | HTTP 200  status=WITHDRAWN id=cmw6rb8wy000tlbwxui588oqq |
| REQ-BROWSE | Consultation des demandes publiées | trucker | PASS | demande visible | HTTP 200 found=True |
| REQ-CREATE | Création d'une demande | client | PASS | HTTP 201 | HTTP 201  status=DRAFT id=cmw6rb772000ilbwxsd3ea9nt status=DRAFT |
| REQ-IDOR | Lecture d'une demande d'un autre client | client | PASS | refus | HTTP 403 Forbidden |
| REQ-ISO | Isolation des demandes entre clients | client | PASS | la demande de A est absente de B | HTTP 200 count=0 leak=False |
| REQ-PUB | Publication de la demande | client | PASS | PUBLISHED | HTTP 200  status=PUBLISHED id=cmw6rb772000ilbwxsd3ea9nt status=PUBLISHED |
| REQ-VAL | Demande invalide | client | PASS | HTTP 400 | HTTP 400 Validation failed |
| SIGNUP-client-a | Inscription client-a | CLIENT | PASS | 201, SMS non délivré, pas de code en clair | HTTP 201 Inscription réussie. Vérifiez votre numéro pour les opérations payantes. smsDelivered=False phoneVerificationRequired=True |
| SIGNUP-client-b | Inscription client-b | CLIENT | PASS | 201, SMS non délivré, pas de code en clair | HTTP 201 Inscription réussie. Vérifiez votre numéro pour les opérations payantes. smsDelivered=False phoneVerificationRequired=True |
| SIGNUP-trucker-a | Inscription trucker-a | TRUCKER | PASS | 201, SMS non délivré, pas de code en clair | HTTP 201 Inscription réussie. Vérifiez votre numéro pour les opérations payantes. smsDelivered=False phoneVerificationRequired=True |
| SIGNUP-trucker-b | Inscription trucker-b | TRUCKER | PASS | 201, SMS non délivré, pas de code en clair | HTTP 201 Inscription réussie. Vérifiez votre numéro pour les opérations payantes. smsDelivered=False phoneVerificationRequired=True |
| SUB-PHONE | Achat de forfait sans téléphone vérifié | trucker | PASS | HTTP 403 | HTTP 403 Vérifiez votre numéro de téléphone avant cette opération. |
| SUB-PLANS | Catalogue de forfaits | public | PASS | liste non vide | HTTP 200 count=3 |
| UI-404 | Page inconnue | visiteur | PASS | 404 | 404 en anglais, sans l'habillage WAGESSE. Capture 04-404.png. |
| UI-ADMIN-ROLE | Page /admin avec un transporteur | trucker | PASS | Pas d'écran d'administration | Retour au tableau de bord transporteur. L'API admin répond 401. Capture 21-admin-refuse.png. |
| UI-BROWSE | Liste transporteur | trucker | PASS | La demande de recette est visible | Gravier de recette, 18 tonnes, Ouagadougou vers Koudougou. Capture 19-transporteur-demandes.png. |
| UI-BUY | Confirmation d'achat sans numéro vérifié | client | PASS | Aucun crédit attribué | La page explique le règlement manuel. Le bouton affiche : vérifiez votre numéro. Capture 22-achat-refuse.png. |
| UI-DASH | Tableau de bord client avec session | client | PASS | Demandes, crédits à 0, plan FREE | 1 demande publiée, 0 mission, solde 0. Capture 10-client-tableau.png. |
| UI-FORM | Formulaire de demande | client | PASS | Matériau, lieux, quantité, date | Formulaire affiché. Capture 12-client-nouvelle-demande.png. |
| UI-MOBILE | Accueil mobile 390 px | visiteur | PASS | Page utilisable | Capture 05-accueil-mobile.png, Chromium. |
| UI-TABLET | Tarifs tablette 768 px | visiteur | PASS | Page utilisable | Capture 06-tarifs-tablette.png, Chromium. |
| UI-VEH | Véhicule dans l'interface | trucker | PASS | Le véhicule créé par l'API apparaît | RC-A-D47F, benne, 20 t. Capture 18-transporteur-vehicules.png. |
| UNL-PHONE | Déblocage de contacts sans téléphone vérifié | client | PASS | HTTP 403 PHONE_NOT_VERIFIED | HTTP 403 Vérifiez votre numéro de téléphone avant cette opération. |
| VEH-A | Ajout d'un véhicule | trucker | PASS | HTTP 201 | HTTP 201  id=cmw6rb88y000plbwxfow229jd |
| VEH-B | Ajout d'un second véhicule | trucker | PASS | HTTP 201 | HTTP 201  id=cmw6rb8hj000rlbwxsvwlt5qp |
| VEH-ISO | Isolation des véhicules | trucker | PASS | seul le véhicule du compte | own=1 hasA=True hasB=False |
| SEC-HDR | En-têtes HTTP de durcissement | public | FAIL | HSTS, nosniff, frame denial, sans X-Powered-By | Réponse nginx/1.24 avec x-powered-by: Next.js. Pas de strict-transport-security, x-content-type-options ni x-frame-options. |
| UI-LOGIN | Connexion dans le navigateur | client | FAIL | Ouverture du tableau de bord. Le SMS ne sert qu'aux achats et aux contacts. | Le jeton est créé, puis l'interface ouvre /auth/verify. Le SMS n'est pas parti. Capture 08-verification-sms.png. |
| ADM-AUTH | Connexion administrateur de recette | admin | BLOCKED | Session admin distincte | L'inscription publique refuse le rôle ADMIN. Le mot de passe de l'administrateur déjà en place n'a pas été modifié ni lu. |
| ADM-DASH | Tableau de bord et écrans admin authentifiés | admin | BLOCKED | KPI, utilisateurs, commandes | Pas de session administrateur disponible. |
| BKP | Sauvegarde et restauration MariaDB | exploitation | BLOCKED | Restauration vérifiée | Non exécutée : elle exigerait un accès root et une base jetable. La base de préproduction n'a pas été restaurée ni effacée. |
| BRW-OTHER | Firefox et Safari | visiteur | BLOCKED | Mêmes parcours | Seul Chromium, livré avec Playwright, a été utilisé. |
| MIS-ACC | Acceptation d'un devis et création de mission | client | BLOCKED | Mission créée une seule fois | HTTP 402 : le déblocage du contact est exigé. Ce déblocage exige un téléphone vérifié (HTTP 403). |
| PAY-CYCLE | Cycle complet de paiement manuel | client et admin | BLOCKED | Commande, validation, crédit unique, refus sans crédit | L'achat est refusé tant que le téléphone n'est pas vérifié. Le SMS n'est pas délivré et la simulation est interdite. La validation admin n'a donc pas été exécutée. |
| ADM-STUB | Rôles, contenus, matériaux, promotions, types de camions | admin | NOT IMPLEMENTED | Écrans de gestion | Les pages du code affichent « en cours de construction ». Non ouvertes avec un admin. |
| LEG-PRIV | Confidentialité /privacy et /legal/privacy | visiteur | NOT IMPLEMENTED | Page lisible | HTTP 404 sur la préproduction déployée. |
| LEG-TERMS | Mentions légales /terms et /legal/terms | visiteur | NOT IMPLEMENTED | Page lisible | HTTP 404 sur la préproduction déployée. |
| NOTIF-USER | Notifications côté client | client | NOT IMPLEMENTED | Liste des notifications | Pas de route /api/notifications. L'écran existe seulement dans l'administration. |
| ROLE-OP | Profil opérateur | operator | NOT IMPLEMENTED | Parcours propre | Le rôle existe dans le schéma. L'inscription ne propose que CLIENT et TRUCKER. L'opérateur est routé comme un client. |
