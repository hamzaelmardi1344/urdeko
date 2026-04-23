"use client";

import { useEffect, useRef } from "react";
import { requestRenderAction } from "@/lib/actions";

/**
 * Déclenche le render a l'arrivee sur la page.
 * On evite le double-fire via un ref (Strict Mode en dev).
 */
export function RenderKickoff({ projectId }: { projectId: string }) {
  const dispatched = useRef(false);
  useEffect(() => {
    if (dispatched.current) return;
    dispatched.current = true;
    void requestRenderAction(projectId);
  }, [projectId]);
  return null;
}
