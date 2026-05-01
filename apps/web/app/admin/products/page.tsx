import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { productSchema, type CreateProductInput, type Product } from "@bep/shared-types";
import { normalizeManualProductFormData } from "@/admin/product-form";
import { formatMAD } from "@/lib/money";
import "./admin-products.css";

export const dynamic = "force-dynamic";

const productsSchema = z.array(productSchema);
const provisionResponseSchema = z.object({
  user: z.object({ id: z.string() }),
});

type SearchParams = Record<string, string | string[] | undefined>;

type AdminProductsPageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const params = (await searchParams) ?? {};
  const created = readSearchParam(params.created);
  const actionError = readSearchParam(params.error);
  const authObject = await auth.protect();
  const token = await authObject.getToken();
  let products: Product[] = [];
  let loadError: string | null = null;

  if (!token) {
    loadError = "La session Clerk ne contient pas de token API.";
  } else {
    try {
      await provisionCurrentUser(token);
      products = await fetchProducts(token);
    } catch (error) {
      loadError = friendlyAdminError(error);
    }
  }

  return (
    <main className="admin-products-page">
      <section className="admin-products-hero container">
        <p className="admin-products-eyebrow">Backoffice vendeur</p>
        <div>
          <h1>Produits</h1>
          <p>
            Ajoute un produit manuel au catalogue Jibi sans passer par l'import. Les produits
            publiés apparaissent ensuite dans la boutique publique.
          </p>
        </div>
      </section>

      <section className="container admin-products-layout">
        <div className="admin-products-stack">
          {created ? (
            <div className="admin-products-alert success">Produit ajouté au catalogue.</div>
          ) : null}
          {actionError ? <div className="admin-products-alert danger">{actionError}</div> : null}
          {loadError ? <div className="admin-products-alert danger">{loadError}</div> : null}

          <ProductList products={products} disabled={Boolean(loadError)} />
        </div>

        <ProductCreateForm disabled={Boolean(loadError)} />
      </section>
    </main>
  );
}

async function createManualProductAction(formData: FormData) {
  "use server";

  const authObject = await auth.protect();
  const token = await authObject.getToken();
  let errorMessage: string | null = null;

  if (!token) {
    errorMessage = "La session Clerk ne contient pas de token API.";
  } else {
    try {
      await provisionCurrentUser(token);
      const product = normalizeManualProductFormData(formData);
      await createProduct(token, product);
    } catch (error) {
      errorMessage = friendlyAdminError(error);
    }
  }

  if (errorMessage) {
    redirect(`/admin/products?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?created=1");
}

function ProductList({ products, disabled }: { products: Product[]; disabled: boolean }) {
  return (
    <section className="admin-products-panel">
      <div className="admin-products-panel-header">
        <div>
          <h2>Catalogue</h2>
          <p>{disabled ? "Connecte une boutique pour charger les produits." : `${products.length} produit(s)`}</p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="admin-products-empty">
          {disabled
            ? "Les produits seront affichés ici quand le compte aura une boutique."
            : "Aucun produit pour le moment. Ajoute le premier produit manuel avec le formulaire."}
        </div>
      ) : (
        <div className="admin-products-table" role="table" aria-label="Produits">
          <div className="admin-products-row header" role="row">
            <span role="columnheader">Produit</span>
            <span role="columnheader">Prix</span>
            <span role="columnheader">Stock</span>
            <span role="columnheader">Statut</span>
            <span role="columnheader">Source</span>
          </div>
          {products.map((product) => (
            <div className="admin-products-row" role="row" key={product.id}>
              <div className="admin-products-title-cell">
                {product.images[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.images[0].url} alt="" />
                ) : (
                  <div className="admin-products-image-fallback" />
                )}
                <div>
                  <strong>{product.title}</strong>
                  <small>{product.descriptionDarija || product.description}</small>
                </div>
              </div>
              <span>{formatMAD(product.priceMAD)}</span>
              <span>{product.unlimited ? "Illimité" : product.stock}</span>
              <span>
                <ProductBadge label={statusLabel(product.status)} tone={statusTone(product.status)} />
              </span>
              <span>
                <ProductBadge
                  label={product.sourceInstagramPostId ? "Import" : "Manuel"}
                  tone={product.sourceInstagramPostId ? "import" : "manual"}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ProductCreateForm({ disabled }: { disabled: boolean }) {
  return (
    <form action={createManualProductAction} className="admin-products-form">
      <div>
        <p className="admin-products-eyebrow">Ajout manuel</p>
        <h2>Nouveau produit</h2>
        <p>Les champs vides optionnels ne seront pas envoyés à l'API.</p>
      </div>

      <label>
        Titre français
        <input name="title" required disabled={disabled} placeholder="Caftan moderne" />
      </label>
      <label>
        Titre arabe
        <input name="titleAr" disabled={disabled} placeholder="اختياري" dir="rtl" />
      </label>
      <label>
        Description française
        <textarea name="description" required disabled={disabled} rows={4} />
      </label>
      <label>
        Description arabe
        <textarea name="descriptionAr" disabled={disabled} rows={3} dir="rtl" />
      </label>
      <label>
        Description darija
        <textarea name="descriptionDarija" disabled={disabled} rows={3} />
      </label>

      <div className="admin-products-form-grid">
        <label>
          Prix MAD
          <input name="priceMAD" type="number" min="0" step="0.01" required disabled={disabled} />
        </label>
        <label>
          Prix barré MAD
          <input name="comparePriceMAD" type="number" min="0" step="0.01" disabled={disabled} />
        </label>
        <label>
          Stock
          <input name="stock" type="number" min="0" step="1" required defaultValue="0" disabled={disabled} />
        </label>
        <label>
          Statut
          <select name="status" defaultValue="DRAFT" disabled={disabled}>
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publié</option>
          </select>
        </label>
      </div>

      <label className="admin-products-checkbox">
        <input name="unlimited" type="checkbox" disabled={disabled} />
        Stock illimité
      </label>

      <label>
        URL image
        <input
          name="imageUrl"
          type="url"
          required
          disabled={disabled}
          placeholder="https://media.example.com/produit.jpg"
        />
      </label>

      <label>
        Variantes JSON
        <textarea
          name="variantsJson"
          disabled={disabled}
          rows={5}
          placeholder='[{"name":"Noir / M","stock":8,"priceMAD":249,"sku":"NOIR-M"}]'
        />
      </label>

      <button type="submit" disabled={disabled}>
        Ajouter le produit
      </button>
    </form>
  );
}

function ProductBadge({
  label,
  tone,
}: {
  label: string;
  tone: "draft" | "published" | "archived" | "stock" | "manual" | "import";
}) {
  return <span className={`admin-products-badge ${tone}`}>{label}</span>;
}

async function provisionCurrentUser(token: string): Promise<void> {
  const user = await currentUser();
  if (!user) {
    throw new Error("Profil Clerk introuvable.");
  }

  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("Le compte Clerk doit avoir un email pour être provisionné dans Jibi.");
  }

  const fullName =
    user.fullName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    email.split("@")[0] ||
    "Vendeur Jibi";
  const phoneE164 = user.primaryPhoneNumber?.phoneNumber ?? user.phoneNumbers[0]?.phoneNumber;
  const payload = {
    token,
    email: email.toLowerCase(),
    fullName,
    phoneE164: phoneE164 && /^\+[1-9]\d{7,14}$/.test(phoneE164) ? phoneE164 : undefined,
    locale: "fr",
  };
  const response = await apiRequest("/auth/provision", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  provisionResponseSchema.parse(response);
}

async function fetchProducts(token: string): Promise<Product[]> {
  const response = await apiRequest("/products", {
    method: "GET",
    token,
  });
  return productsSchema.parse(response);
}

async function createProduct(token: string, product: CreateProductInput): Promise<void> {
  await apiRequest("/products", {
    method: "POST",
    token,
    body: JSON.stringify(product),
  });
}

async function apiRequest(
  path: string,
  options: { method: "GET" | "POST"; token?: string; body?: string },
): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: options.method,
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body,
  });
  const payload = await readJsonPayload(response);
  if (!response.ok) {
    throw new Error(readApiError(payload, response.status));
  }
  return payload;
}

async function readJsonPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function readApiError(payload: unknown, status: number): string {
  const parsed = z.object({ message: z.string() }).partial().safeParse(payload);
  return parsed.success && parsed.data.message ? parsed.data.message : `Erreur API ${status}`;
}

function apiBaseUrl(): string {
  return (process.env.PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
}

function friendlyAdminError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return "Vérifie les champs du produit: certains formats ne sont pas valides.";
  }
  if (!(error instanceof Error)) {
    return "Une erreur inconnue est survenue.";
  }
  if (error.message.includes("shop context") || error.message.includes("Shop not found")) {
    return "Aucune boutique n'est associée à ce compte. Crée d'abord ta boutique dans l'app mobile Jibi.";
  }
  return error.message;
}

function statusLabel(status: Product["status"]): string {
  if (status === "PUBLISHED") return "Publié";
  if (status === "ARCHIVED") return "Archivé";
  if (status === "OUT_OF_STOCK") return "Rupture";
  return "Brouillon";
}

function statusTone(status: Product["status"]): "draft" | "published" | "archived" | "stock" {
  if (status === "PUBLISHED") return "published";
  if (status === "ARCHIVED") return "archived";
  if (status === "OUT_OF_STOCK") return "stock";
  return "draft";
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
