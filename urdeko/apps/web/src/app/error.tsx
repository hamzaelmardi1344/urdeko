"use client";

import { Icon } from "@urdeko/design-system";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface px-6 text-center text-on-surface">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
          <Icon name="warning" size={28} />
        </div>
        <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
          Un petit accroc est survenu
        </h1>
        <p className="max-w-sm text-on-surface-variant">
          {error.message || "Une erreur inattendue s'est produite. Ré-essayez dans un instant."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="glow-gradient h-12 rounded-md px-6 font-headline font-bold text-on-primary-container shadow-glow"
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
