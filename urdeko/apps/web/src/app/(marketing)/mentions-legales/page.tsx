import type { Metadata } from "next";
import { env } from "@/env";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Informations légales relatives à l'éditeur du site UrdeKo.",
};

export default function MentionsLegalesPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold text-on-surface">Mentions légales</h1>
      <section className="mt-6 space-y-4 text-on-surface-variant">
        <p>
          Le site <strong>urdeko.app</strong> est édité par{" "}
          <strong>{env.LEGAL_COMPANY_NAME}</strong>, dont le siège social est situé&nbsp;
          {env.LEGAL_COMPANY_ADDRESS}.
        </p>
        <p>
          Contact :{" "}
          <a className="text-primary underline" href={`mailto:${env.LEGAL_CONTACT_EMAIL}`}>
            {env.LEGAL_CONTACT_EMAIL}
          </a>
        </p>
        <p>
          Directeur de la publication : l'équipe fondatrice de {env.LEGAL_COMPANY_NAME}.
        </p>
        <h2 className="text-xl font-semibold text-on-surface mt-8">Hébergement</h2>
        <p>
          Hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA —
          vercel.com.
        </p>
        <h2 className="text-xl font-semibold text-on-surface mt-8">Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments (textes, visuels, logos, générés ou non) est la
          propriété de {env.LEGAL_COMPANY_NAME} ou de ses partenaires. Toute reproduction
          sans autorisation écrite est interdite.
        </p>
      </section>
    </main>
  );
}
