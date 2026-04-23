"use client";

import Link from "next/link";
import { Icon, StepIndicator } from "@urdeko/design-system";
import { RetryEmptyRoomButton } from "@/components/flow/RetryEmptyRoomButton";
import { JobPoller } from "./JobPoller";

export function PreparationScreen({
  projectId,
  originalUrl,
  title,
  description,
  targetKind,
  redirectTo,
}: {
  projectId: string;
  originalUrl: string | null;
  title: string;
  description: string;
  targetKind: "empty_room" | "render";
  redirectTo: string;
}) {
  const analysisSteps =
    targetKind === "empty_room"
      ? [
          { label: "Analyse de la photo" },
          { label: "Détection du mobilier existant" },
          { label: "Retrait des éléments" },
          { label: "Finalisation du rendu de l'espace vide" },
        ]
      : [
          { label: "Composition du mobilier" },
          { label: "Ajustement des proportions" },
          { label: "Mise en lumière" },
          { label: "Rédaction du conseil UrdeKo" },
        ];

  return (
    <JobPoller projectId={projectId} kind={targetKind} redirectTo={redirectTo}>
      {(state) => {
        const progress = state.status === "succeeded" ? 100 : Math.max(state.progress, 8);
        const activeStep = Math.min(
          analysisSteps.length - 1,
          Math.floor((progress / 100) * analysisSteps.length),
        );

        return (
          <section className="flex flex-col items-center gap-8 py-4">
            <div className="relative h-64 w-64">
              <div className="absolute inset-0 rounded-full bg-surface-container-low" />
              {originalUrl ? (
                <img
                  src={originalUrl}
                  alt=""
                  className="absolute inset-4 h-56 w-56 rounded-full object-cover opacity-80 blur-[1px]"
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full frosted-pane px-6 py-4 shadow-ambient">
                  <span className="font-headline text-display-md font-black tracking-tight text-primary">
                    {progress}%
                  </span>
                </div>
              </div>
              <svg
                aria-hidden
                className="absolute inset-0 spin-slow"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="rgb(var(--color-primary-container))"
                  strokeWidth="2"
                  strokeDasharray="2 6"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </svg>
            </div>

            <div className="w-full max-w-sm text-center">
              <h1 className="font-headline text-headline-sm font-extrabold tracking-tight text-on-surface">
                {title}
              </h1>
              <p className="mt-3 font-body text-on-surface-variant">{description}</p>
            </div>

            <div className="mt-4 w-full max-w-sm">
              <StepIndicator
                steps={analysisSteps.map((step, idx) => ({
                  label: step.label,
                  status:
                    state.status === "failed" && idx === activeStep
                      ? "active"
                      : idx < activeStep
                        ? "completed"
                        : idx === activeStep
                          ? "active"
                          : "upcoming",
                }))}
              />
            </div>

            {state.status === "failed" ? (
              <div className="mt-6 flex w-full flex-col items-center gap-3 rounded-xl bg-error/10 p-5 text-error">
                <Icon name="error" size={28} />
                <p className="text-center text-sm font-semibold">
                  {state.error ?? "Une erreur est survenue. Réessaye dans un instant."}
                </p>
                <div className="mt-2 flex flex-col items-center gap-2">
                  {targetKind === "empty_room" ? (
                    <RetryEmptyRoomButton
                      projectId={projectId}
                      label="Relancer l'IA"
                      variant="danger"
                      className="h-auto rounded-full px-5 py-2 text-sm"
                    />
                  ) : null}
                  <Link
                    href={`/projets/${projectId}/photo/import`}
                    className="text-sm font-bold underline"
                  >
                    Choisir une autre photo
                  </Link>
                </div>
              </div>
            ) : null}
          </section>
        );
      }}
    </JobPoller>
  );
}
