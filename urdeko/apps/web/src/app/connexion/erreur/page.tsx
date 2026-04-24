import Link from "next/link";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";

export const metadata = { title: "Erreur de connexion" };

type ErrorBlock = { title: string; lines: string[] };

const COPY = {
  Configuration: {
    title: "Problème de configuration (email)",
    lines: [
      "Le plus souvent : l’adresse d’expédition AUTH_EMAIL_FROM utilise un domaine non vérifié chez Resend (erreur 403 « domain is not verified »).",
      "Corrige sur https://resend.com/domains en ajoutant et vérifiant ton domaine, ou mets temporairement AUTH_EMAIL_FROM = « UrdeKo <onboarding@resend.dev> » sur Vercel (uniquement vers l’email du compte Resend).",
      "Vérifie aussi que AUTH_URL sur Vercel est exactement l’URL où tu ouvres le site (ex. https://urdeko.vercel.app si tu n’as pas encore de domaine custom).",
    ],
  },
  AccessDenied: {
    title: "Accès refusé",
    lines: ["Tu n’as pas l’autorisation de te connecter avec ce compte."],
  },
  Verification: {
    title: "Lien expiré ou déjà utilisé",
    lines: ["Demande un nouveau lien depuis la page Connexion."],
  },
  Default: {
    title: "Connexion impossible",
    lines: [
      "Une erreur s’est produite pendant l’envoi du lien ou la validation.",
      "Réessaie dans un instant ; si ça continue, consulte les logs Vercel (filtre /api/auth).",
    ],
  },
} satisfies Record<string, ErrorBlock>;

function blockForError(code: string | undefined): ErrorBlock {
  switch (code) {
    case "Configuration":
      return COPY.Configuration;
    case "AccessDenied":
      return COPY.AccessDenied;
    case "Verification":
      return COPY.Verification;
    default:
      return COPY.Default;
  }
}

export default async function ConnexionErreurPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: raw } = await searchParams;
  const block = blockForError(raw);
  const error = raw ?? "Default";

  return (
    <>
      <TopAppBar title="Connexion" backHref="/connexion" />
      <FlowShell bottomPadding="cta">
        <section className="mb-8">
          <h1 className="mb-3 font-headline text-headline-md font-extrabold tracking-tight text-error">
            {block.title}
          </h1>
          <ul className="list-disc space-y-3 pl-5 font-body text-on-surface-variant">
            {block.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-on-surface-variant">
            Code technique : <code className="rounded bg-surface-container px-1 py-0.5">{error}</code>
          </p>
        </section>

        <Link
          href="/connexion"
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-headline font-bold text-on-primary"
        >
          Retour à la connexion
        </Link>
      </FlowShell>
    </>
  );
}
