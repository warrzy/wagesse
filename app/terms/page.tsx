import LegalPage from "@/components/LegalPage"

export default function TermsPage() {
  return (
    <LegalPage title="Mentions légales et conditions d'utilisation">
      <p>
        WAGESSE est une place de mise en relation pour le transport de matériaux au Burkina Faso.
        La préproduction est publiée sur preprod.wagesse.fr. Elle ne constitue pas le site de production.
      </p>
      <p>
        L&apos;éditeur met en relation des clients qui publient une demande et des transporteurs qui proposent un devis.
        WAGESSE n&apos;exécute pas le transport et n&apos;encaisse pas le prix de la course dans cette version.
      </p>
      <p>
        Le paiement des crédits et des forfaits suit le mode configuré. En préproduction, ce mode est manuel :
        une commande est enregistrée, puis un administrateur la valide ou la refuse. Aucun crédit n&apos;est attribué
        avant cette validation. PayDunya n&apos;est pas activé.
      </p>
      <p>
        Le compte est ouvert avec un numéro de téléphone et un mot de passe. Le code SMS sert à vérifier le numéro
        avant un achat ou un déblocage de contact. Les coordonnées d&apos;un tiers restent masquées tant que le contact
        n&apos;est pas débloqué.
      </p>
      <p>
        Les données de démonstration et les comptes de recette ne doivent pas être repris en production.
      </p>
    </LegalPage>
  )
}
