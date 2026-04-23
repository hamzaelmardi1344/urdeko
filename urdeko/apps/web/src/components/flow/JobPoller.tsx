"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type JobState = {
  status: "queued" | "running" | "succeeded" | "failed";
  progress: number;
  error: string | null;
};

export function JobPoller({
  projectId,
  kind,
  redirectTo,
  intervalMs = 2000,
  onComplete,
  children,
}: {
  projectId: string;
  kind: "analyze_photo" | "empty_room" | "render";
  redirectTo?: string;
  intervalMs?: number;
  onComplete?: (state: JobState) => void;
  children: (state: JobState) => React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<JobState>({
    status: "queued",
    progress: 5,
    error: null,
  });
  const settled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled || settled.current) return;
      try {
        const res = await fetch(
          `/api/projects/${projectId}/jobs?kind=${kind}`,
          { cache: "no-store" },
        );
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
  }, [projectId, kind, intervalMs, redirectTo, router, onComplete]);

  return <>{children(state)}</>;
}
