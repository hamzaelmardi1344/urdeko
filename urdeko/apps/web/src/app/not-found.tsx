import Link from "next/link";
import { Icon } from "@urdeko/design-system";

// Force static generation pour éviter le bug Next 15.5.x où App Router
// not-found.tsx n'est pas classé "static" et déclenche le fallback Pages
// Router /_error qui crashe avec "<Html> should not be imported outside
// of pages/_document". Voir: github.com/vercel/next.js/issues/83784
export const dynamic = "force-static";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-ambient">
        <Icon name="travel_explore" size={30} />
      </div>
      <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
        Cette page n'existe pas
      </h1>
      <p className="max-w-sm text-on-surface-variant">
        Le lien est peut-être obsolète, ou la page a été déplacée.
      </p>
      <Link
        href="/"
        className="glow-gradient h-12 rounded-md px-6 py-3 font-headline font-bold text-on-primary-container shadow-glow"
      >
        Retour à l'accueil
      </Link>
    </main>
  );
}
