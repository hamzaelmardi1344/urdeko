import type { Metadata } from "next";
import { env } from "@/env";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité UrdeKo : données collectées, finalités, droits RGPD et loi 09-08.",
};

export default function ConfidentialitePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold text-on-surface">
        Politique de confidentialité
      </h1>
      <section className="mt-6 space-y-4 text-on-surface-variant">
        <p>
          UrdeKo, édité par {env.LEGAL_COMPANY_NAME}, respecte le Règlement général sur
          la protection des données (RGPD) et la loi marocaine 09-08 relative à la
          protection des personnes physiques à l'égard du traitement des données à
          caractère personnel.
        </p>

        <h2 className="text-xl font-semibold text-on-surface mt-8">
          Données collectées
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Adresse e-mail (authentification et communication projet).</li>
          <li>
            Nom, ville, téléphone (fourni volontairement lors de la création d'un
            projet).
          </li>
          <li>
            Photos envoyées et rendus générés — stockés chez notre prestataire
            Cloudflare R2 dans la région EU/EEMEA.
          </li>
          <li>Données techniques (logs serveur, identifiants de session).</li>
        </ul>

        <h2 className="text-xl font-semibold text-on-surface mt-8">Finalités</h2>
        <p>
          Les données sont utilisées uniquement pour&nbsp;: authentifier l'utilisateur,
          générer les propositions de design via notre moteur IA (Google Gemini),
          contacter le client à sa demande, mesurer l'usage du service (Vercel
          Analytics, anonymisé).
        </p>

        <h2 className="text-xl font-semibold text-on-surface mt-8">
          Durée de conservation
        </h2>
        <p>
          Les projets et photos sont conservés tant que le compte est actif. Tu peux
          demander leur suppression à tout moment depuis la page Profil ou par email à{" "}
          <a
            className="text-primary underline"
            href={`mailto:${env.LEGAL_CONTACT_EMAIL}`}
          >
            {env.LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold text-on-surface mt-8">Sous-traitants</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Vercel (hébergement, analytics anonymisé) — USA / EU.</li>
          <li>Neon (base de données Postgres) — EU.</li>
          <li>Cloudflare R2 (stockage objets) — EU/EEMEA.</li>
          <li>Google Gemini (inférence IA) — sans stockage long terme des photos.</li>
          <li>SMTP (envoi transactionnel et liens de connexion), ex. Gmail.</li>
        </ul>

        <h2 className="text-xl font-semibold text-on-surface mt-8">Tes droits</h2>
        <p>
          Tu disposes d'un droit d'accès, de rectification, d'opposition, de portabilité
          et de suppression. Contacte-nous à{" "}
          <a
            className="text-primary underline"
            href={`mailto:${env.LEGAL_CONTACT_EMAIL}`}
          >
            {env.LEGAL_CONTACT_EMAIL}
          </a>{" "}
          pour toute demande.
        </p>
      </section>
    </main>
  );
}
