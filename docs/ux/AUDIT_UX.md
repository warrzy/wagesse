# Audit UX/UI — WAGESSE, avant la refonte

État observé sur le commit déployé `0663bd074652510e115f662e3ceb85a1e6911caf`, avant les changements de cette branche.

## Constats prioritaires

1. L’accueil n’avait pas de photographies de chantier. Les cartes matériaux et camions étaient des rectangles vides ou des dégradés.
2. Des affirmations n’étaient pas couvertes par le produit : support 24/7, siège et bureaux à Ouagadougou, Abidjan, Cotonou et Niamey, avis nominatifs, note 4,8/5, suivi GPS, assurance livraison, paiement versé au camionneur seulement après livraison, camionneurs tous vérifiés.
3. La carte « offre disponible » affichait une note et un bouton sans demande réelle derrière.
4. Le téléphone du pied de page était un numéro fictif (`+226 xx xx xx xx`) et WhatsApp pointait vers un lien incomplet.
5. Deux palettes coexistaient : terracotta `#E8714D` dans les espaces connectés, orange `#F97316` et ardoise `#0F172A` sur l’accueil. L’identité documentée dans `lib/config.ts` n’était pas celle affichée.
6. Les tailles de titres fixées dans la feuille globale écrasaient les classes Tailwind, d’où une hiérarchie plate.
7. Les boutons primaires passaient en pleine largeur sous 640 px, y compris lorsqu’ils étaient côte à côte.
8. Le parcours transporteur n’avait pas de navigation mobile persistante. Les actions importantes demandaient de revenir au tableau de bord.
9. L’administration utilisait un bleu très sombre et des lignes de menu petites pour un usage au doigt.
10. Les formulaires d’accueil ne transmettaient pas le trajet au formulaire de demande.

## Ce qui fonctionnait et devait rester

L’authentification téléphone et mot de passe, les rôles, les demandes, les devis, le paiement manuel, les crédits, le masquage des contacts et les étapes de mission sont validés. Prisma et les règles financières ne sont pas modifiés pour cette refonte.

## Contrôle après refonte

Compilation de production Next.js 16.2.12 : 5,5 s de compilation, contrôle TypeScript inclus, 89 pages générées. L’accueil local répond en 31 ms pour 57 Ko de document. Les cinq photographies pèsent ensemble environ 2,1 Mo avant transformation par `next/image`. Aux largeurs 360, 390, 768, 1024 et 1440 px, le document ne déborde pas horizontalement et le titre principal est dans le premier écran. Les 34 tests unitaires passent.

## Direction retenue

Palette « Marketplace Logistics Premium — West Africa » : bleu nuit `#13283A`, orange chantier `#ED8A25`, or sable `#E8B55B`, blanc cassé `#F5F4F0`, vert profond `#354B44`. Typographie Plus Jakarta Sans. Les photographies sont des fichiers Pexels, documentés dans `docs/ux/IMAGES.md`, présentées comme des illustrations et non comme des chantiers WAGESSE.
