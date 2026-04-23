"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Après un restart / rebuild Next, le navigateur peut conserver des références
 * RSC (ex. anciennes Server Actions). Un `router.refresh()` unique par route
 * et par onglet réaligne le client sur le manifeste serveur actuel.
 */
export function RscAlignOnMount() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const key = `urdeko_rsc_aligned:${pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // navigation privée / sessionStorage indisponible
    }
    router.refresh();
  }, [pathname, router]);

  return null;
}
