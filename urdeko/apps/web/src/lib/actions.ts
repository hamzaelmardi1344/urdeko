"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "./db/client";
import {
  contacts,
  projectElements,
  projectPhotos,
  projectSelections,
  projects,
} from "./db/schema";
import {
  assertProjectAccess,
  createProject,
  getProjectOrThrow,
  updateProject,
} from "./projects";
import { uploadObject } from "./storage";
import { enqueueJob } from "./jobs/dispatch";
import { rateLimit, RATE_LIMITS } from "./rate-limit";
import { auth } from "./auth";
import { getGuestId } from "./guest";
import { getProduct } from "./catalogue";
import {
  DEFAULT_BUDGET_MAD,
  DEFAULT_FLEXIBILITY,
  ELEMENT_CATEGORIES,
  PALETTES,
  ROOM_TYPES,
  STYLES,
} from "./domain";

// ---------------------------------------------------------------
// 1. Creer un projet (etape "Nommer le projet")
// ---------------------------------------------------------------

export async function createProjectAction(formData: FormData) {
  const schema = z.object({
    name: z.string().min(1, "Donne un nom à ton projet").max(80),
    budgetMad: z.coerce.number().int().min(500).max(500000).default(DEFAULT_BUDGET_MAD),
    flexibility: z.coerce.number().int().min(0).max(100).default(DEFAULT_FLEXIBILITY),
  });
  const parsed = schema.parse({
    name: formData.get("name"),
    budgetMad: formData.get("budgetMad") ?? DEFAULT_BUDGET_MAD,
    flexibility: formData.get("flexibility") ?? DEFAULT_FLEXIBILITY,
  });

  const project = await createProject(parsed);
  redirect(`/projets/${project.id}/espace`);
}

// ---------------------------------------------------------------
// 2. Selection espace
// ---------------------------------------------------------------

export async function selectRoomTypeAction(projectId: string, formData: FormData) {
  await assertProjectAccess(projectId);
  const roomType = formData.get("roomType");
  const allowed = ROOM_TYPES.map((r) => r.id) as readonly string[];
  if (typeof roomType !== "string" || !allowed.includes(roomType)) {
    throw new Error("Type d'espace invalide");
  }
  await updateProject(projectId, { roomType: roomType as never });
  redirect(`/projets/${projectId}/photo/guide`);
}

// ---------------------------------------------------------------
// 3. Upload photo + dispatch analyse IA
// (Le client compresse avant envoi : Vercel ~4,5 Mo max sur le corps de la requête.)
// ---------------------------------------------------------------

async function currentIdentity(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) return `u:${session.user.id}`;
  const guest = await getGuestId();
  return `g:${guest ?? "anon"}`;
}

export async function uploadProjectPhotoAction(projectId: string, formData: FormData) {
  await assertProjectAccess(projectId);
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucune photo envoyée");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("La photo dépasse 20 Mo");
  }
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Merci de fournir un fichier image");
  }

  const who = await currentIdentity();
  const limit = await rateLimit(who, RATE_LIMITS.aiGenerate);
  if (!limit.allowed) {
    throw new Error(
      "Quota IA atteint (20 analyses / heure). Réessaie un peu plus tard.",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadObject({
    buffer,
    contentType: file.type || "image/jpeg",
    keyPrefix: `projects/${projectId}/photos`,
  });

  // Purge les photos precedentes pour rester simple.
  await db.delete(projectPhotos).where(eq(projectPhotos.projectId, projectId));
  const [photo] = await db
    .insert(projectPhotos)
    .values({ projectId, originalUrl: uploaded.url })
    .returning();
  if (!photo) throw new Error("Impossible d'enregistrer la photo");

  await enqueueJob({
    projectId,
    kind: "analyze_photo",
    payload: { projectId, photoId: photo.id, originalUrl: uploaded.url },
  });

  revalidatePath(`/projets/${projectId}`, "layout");
  redirect(`/projets/${projectId}/photo/preparation`);
}

// ---------------------------------------------------------------
// 4. Choix style / palette
// ---------------------------------------------------------------

export async function selectStyleAction(projectId: string, formData: FormData) {
  await assertProjectAccess(projectId);
  const style = formData.get("style");
  if (typeof style !== "string" || !STYLES.some((s) => s.id === style)) {
    throw new Error("Style invalide");
  }
  await updateProject(projectId, { style: style as never });
  redirect(`/projets/${projectId}/palette`);
}

export async function selectPaletteAction(projectId: string, formData: FormData) {
  await assertProjectAccess(projectId);
  const palette = formData.get("palette");
  if (typeof palette !== "string" || !PALETTES.some((p) => p.id === palette)) {
    throw new Error("Palette invalide");
  }
  await updateProject(projectId, { palette });
  redirect(`/projets/${projectId}/elements`);
}

// ---------------------------------------------------------------
// 5. Elements + selection produits
// ---------------------------------------------------------------

export async function setElementsAction(projectId: string, formData: FormData) {
  await assertProjectAccess(projectId);
  const categories = formData.getAll("categories").filter(Boolean).map(String);
  const allowed = new Set(ELEMENT_CATEGORIES.map((c) => c.id));
  const filtered = categories.filter((c) => allowed.has(c as never));
  if (!filtered.length) {
    throw new Error("Sélectionne au moins un élément");
  }
  await db.delete(projectElements).where(eq(projectElements.projectId, projectId));
  await db
    .insert(projectElements)
    .values(filtered.map((category) => ({ projectId, category: category as never })));
  await updateProject(projectId, { status: "elements_chosen" });
  redirect(`/projets/${projectId}/produits/preparation`);
}

export async function selectProductAction(input: {
  projectId: string;
  category: string;
  productId: string;
}) {
  await assertProjectAccess(input.projectId);
  const product = await getProduct(input.productId);
  if (!product || product.category !== input.category) {
    throw new Error("Produit invalide pour cette catégorie");
  }
  await db
    .delete(projectSelections)
    .where(
      and(
        eq(projectSelections.projectId, input.projectId),
        eq(projectSelections.category, input.category as never),
      ),
    );
  await db.insert(projectSelections).values({
    projectId: input.projectId,
    category: input.category as never,
    productId: input.productId,
    priceMad: product.priceMad,
  });
  revalidatePath(`/projets/${input.projectId}`, "layout");
}

export async function completeSelectionsAction(projectId: string) {
  await assertProjectAccess(projectId);
  await updateProject(projectId, { status: "products_chosen" });
  redirect(`/projets/${projectId}/recapitulatif`);
}

// ---------------------------------------------------------------
// 6. Contact + rendu final
// ---------------------------------------------------------------

export async function saveContactAction(projectId: string, formData: FormData) {
  await assertProjectAccess(projectId);
  const schema = z.object({
    fullName: z.string().min(2, "Nom trop court"),
    email: z.string().email("Email invalide"),
    city: z.string().min(2, "Ville requise"),
    phone: z.string().optional(),
    wantsEmail: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
      .transform((v) => v !== null && v !== "false"),
    wantsCallback: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
      .transform((v) => v !== null && v !== "false"),
  });
  const parsed = schema.parse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    city: formData.get("city"),
    phone: formData.get("phone") ?? undefined,
    wantsEmail: formData.get("wantsEmail"),
    wantsCallback: formData.get("wantsCallback"),
  });

  await db.delete(contacts).where(eq(contacts.projectId, projectId));
  await db.insert(contacts).values({ projectId, ...parsed });
  await getProjectOrThrow(projectId);
  redirect(`/projets/${projectId}/generation`);
}

export async function requestRenderAction(projectId: string) {
  await assertProjectAccess(projectId);
  const who = await currentIdentity();
  const limit = await rateLimit(who, RATE_LIMITS.aiGenerate);
  if (!limit.allowed) {
    throw new Error(
      "Quota IA atteint (20 générations / heure). Réessaie un peu plus tard.",
    );
  }
  await updateProject(projectId, { status: "rendering" });
  await enqueueJob({ projectId, kind: "render", payload: { projectId } });
}
