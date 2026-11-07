import LegalPage from "@/components/LegalPage"

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <p>
        WAGESSE traite les données nécessaires au compte et aux demandes de transport : numéro de téléphone,
        nom, ville, description de la marchandise, véhicules déclarés, devis, commandes de crédits et journaux techniques.
      </p>
      <p>
        Le mot de passe est conservé sous forme d&apos;empreinte. Il n&apos;est pas affiché. Le code de vérification SMS
        n&apos;est pas renvoyé dans la réponse lorsque le mode de diagnostic est fermé, ce qui est le cas en préproduction.
      </p>
      <p>
        Un client ne voit pas les demandes d&apos;un autre client. Un transporteur ne voit pas les véhicules d&apos;un confrère.
        Les numéros de téléphone des devis restent masqués tant que le contact n&apos;a pas été débloqué.
      </p>
      <p>
        Les données de préproduction restent sur le serveur de préproduction. Elles ne sont pas la base de production.
        Une demande d&apos;accès ou de suppression se fait par la page Contact.
      </p>
    </LegalPage>
  )
}
