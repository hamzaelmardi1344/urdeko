import type { Metadata } from "next";
import { env } from "@/env";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: "Conditions générales d'utilisation du service UrdeKo.",
};

export default function CguPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold text-on-surface">
        Conditions générales d'utilisation
      </h1>
      <section className="mt-6 space-y-4 text-on-surface-variant">
        <h2 className="text-xl font-semibold text-on-surface">1. Objet</h2>
        <p>
          Les présentes CGU régissent l'accès et l'utilisation du service UrdeKo, édité
          par {env.LEGAL_COMPANY_NAME}. En créant un projet, tu acceptes ces conditions.
        </p>

        <h2 className="text-xl font-semibold text-on-surface mt-6">2. Service</h2>
        <p>
          UrdeKo propose un outil d'aide à la décoration d'intérieur basé sur
          l'intelligence artificielle. Les rendus sont des propositions visuelles non
          contractuelles. Les prix et disponibilités des produits dépendent des
          partenaires marchands.
        </p>

        <h2 className="text-xl font-semibold text-on-surface mt-6">3. Compte</h2>
        <p>
          L'authentification s'effectue par lien magique envoyé par e-mail. Tu es
          responsable de la confidentialité de ton adresse. Un usage gratuit est
          disponible sans compte (projet invité) avec un quota limité.
        </p>

        <h2 className="text-xl font-semibold text-on-surface mt-6">
          4. Contenu utilisateur
        </h2>
        <p>
          Tu conserves la propriété des photos que tu envoies. Tu nous accordes une
          licence non-exclusive et gratuite pour traiter ces photos via nos prestataires
          IA afin de produire les rendus demandés. Nous ne les utilisons ni pour
          entraîner nos modèles, ni à des fins commerciales sans ton accord.
        </p>

        <h2 className="text-xl font-semibold text-on-surface mt-6">
          5. Propriété intellectuelle
        </h2>
        <p>
          Les rendus générés te sont personnellement concédés pour un usage privé. Toute
          exploitation commerciale requiert notre accord écrit.
        </p>

        <h2 className="text-xl font-semibold text-on-surface mt-6">6. Responsabilité</h2>
        <p>
          UrdeKo est fourni « en l'état ». Nous ne pouvons garantir l'exactitude des
          prix, des stocks, ni la pertinence absolue des suggestions IA. La décision
          finale d'achat relève de ta responsabilité.
        </p>

        <h2 className="text-xl font-semibold text-on-surface mt-6">7. Modification</h2>
        <p>
          Ces CGU peuvent évoluer. Toute modification significative sera notifiée aux
          utilisateurs inscrits au moins 15 jours avant son application.
        </p>

        <h2 className="text-xl font-semibold text-on-surface mt-6">8. Droit applicable</h2>
        <p>
          Ces CGU sont régies par le droit marocain. Tout litige relèvera des tribunaux
          compétents de Casablanca.
        </p>

        <p className="mt-8 text-sm">
          Pour toute question :{" "}
          <a
            className="text-primary underline"
            href={`mailto:${env.LEGAL_CONTACT_EMAIL}`}
          >
            {env.LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </main>
  );
}
