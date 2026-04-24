"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type JobState = {
  status: "queued" | "running" | "succeeded" | "failed";
  progress: number;
  error: string | null;
  /** Présent quand l’API agrège plusieurs jobs (ex. pipeline photo). */
  stepIndex?: number;
};

export function JobPoller({
  projectId,
  kind,
  pipeline,
  redirectTo,
  intervalMs = 2000,
  onComplete,
  children,
}: {
  projectId: string;
  kind: "analyze_photo" | "empty_room" | "render";
  /** Ex. `photo_emptied` : fusion analyze_photo + empty_room pour la barre de progression. */
  pipeline?: "photo_emptied";
  redirectTo?: string;
  intervalMs?: number;
  onComplete?: (state: JobState) => void;
  children: (state: JobState) => React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<JobState>({
    status: "queued",
    progress: 1,
    error: null,
  });
  const settled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled || settled.current) return;
      try {
        const qs = new URLSearchParams();
        if (pipeline === "photo_emptied") {
          qs.set("pipeline", "photo_emptied");
        } else {
          qs.set("kind", kind);
        }
        const res = await fetch(`/api/projects/${projectId}/jobs?${qs}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as JobState;
        if (cancelled) return;
        setState(data);
        if (data.status === "succeeded" || data.status === "failed") {
          settled.current = true;
          onComplete?.(data);
          if (data.status === "succeeded" && redirectTo) {
            router.push(redirectTo);
            router.refresh();
          }
          return;
        }
      } catch {
        /* retry on next tick */
      }
      setTimeout(tick, intervalMs);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [projectId, kind, pipeline, intervalMs, redirectTo, router, onComplete]);

  return <>{children(state)}</>;
}
