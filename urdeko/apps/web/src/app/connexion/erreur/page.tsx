import Link from "next/link";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";

export const metadata = { title: "Erreur de connexion" };

type ErrorBlock = { title: string; lines: string[] };

const COPY = {
  Configuration: {
    title: "Problème de configuration (email / SMTP)",
    lines: [
      "Vérifie SMTP_USER / SMTP_PASSWORD (Gmail : mot de passe d’application, pas le mot de passe du compte — https://myaccount.google.com/apppasswords).",
      "AUTH_EMAIL_FROM doit correspondre à SMTP_USER (ex. « UrdeKo <toi@gmail.com> » avec SMTP_USER=toi@gmail.com). Port 587 (STARTTLS) ou 465 (SSL).",
      "AUTH_URL sur Vercel doit être l’URL exacte du site (ex. https://urdeko.vercel.app).",
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
