import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="mx-auto w-full max-w-lg px-6 pb-32 pt-8 text-center">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-on-surface-variant">
        <Link href="/mentions-legales" className="hover:text-primary underline-offset-2 hover:underline">
          Mentions légales
        </Link>
        <span aria-hidden>·</span>
        <Link href="/cgu" className="hover:text-primary underline-offset-2 hover:underline">
          CGU
        </Link>
        <span aria-hidden>·</span>
        <Link href="/confidentialite" className="hover:text-primary underline-offset-2 hover:underline">
          Confidentialité
        </Link>
      </nav>
      <p className="mt-3 text-[11px] text-on-surface-variant/70">
        © {new Date().getFullYear()} UrdeKo. Fabriqué au Maroc.
      </p>
    </footer>
  );
}
