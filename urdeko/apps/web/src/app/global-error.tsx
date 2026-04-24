"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "0 1.5rem",
          textAlign: "center",
          background: "#fffaf6",
          color: "#1a120c",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0 }}>
          Une erreur critique est survenue
        </h1>
        <p style={{ maxWidth: 420, color: "#5b463a", margin: 0 }}>
          {error.message || "L'application a rencontré un problème inattendu. Réessayez dans un instant."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            height: 48,
            padding: "0 1.5rem",
            borderRadius: 8,
            border: 0,
            background: "#a63300",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
