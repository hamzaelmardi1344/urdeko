"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  storefrontCheckoutInputSchema,
  type PublicProduct,
  type PublicShop,
} from "@bep/shared-types";
import { formatMAD } from "@/lib/money";

type CartItem = {
  productId: string;
  title: string;
  priceMAD: number;
  quantity: number;
};

type StorefrontClientProps = {
  shop: PublicShop;
  products: PublicProduct[];
};

export function StorefrontClient({ shop, products }: StorefrontClientProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState({
    fullName: "",
    phoneE164: "+212",
    city: shop.city,
    addressLine: "",
    notes: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const totalMAD = useMemo(
    () => cart.reduce((sum, item) => sum + item.priceMAD * item.quantity, 0),
    [cart],
  );

  function addProduct(product: PublicProduct) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...current,
        { productId: product.id, title: product.title, priceMAD: product.priceMAD, quantity: 1 },
      ];
    });
  }

  async function submitOrder() {
    setStatus(null);
    try {
      const parsed = storefrontCheckoutInputSchema.parse({
        shopSlug: shop.slug,
        customer,
        deliveryMAD: 0,
        source: "PUBLIC_LINK",
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/storefront/checkout`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsed),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        setStatus("La commande n'a pas pu être envoyée. Vérifie le téléphone et réessaie.");
        return;
      }
      const reference =
        typeof payload === "object" && payload !== null && "reference" in payload
          ? String(payload.reference)
          : "";
      setStatus(`Commande reçue ${reference}. La vendeuse confirme sur WhatsApp.`);
      setCart([]);
    } catch {
      setStatus("Complète le nom, le téléphone marocain en +212, la ville et l'adresse.");
    }
  }

  return (
    <main>
      <section className="container hero">
        <div>
          <p className="eyebrow">{shop.city}</p>
          <h1>{shop.name}</h1>
          <p className="bio">
            {shop.bio ?? "Boutique marocaine mobile-first, paiement à la livraison."}
          </p>
          <a className="whatsapp" href={`https://wa.me/${shop.whatsappNumber.replace("+", "")}`}>
            WhatsApp
          </a>
        </div>
        <div className="cart">
          <h2>Commande COD</h2>
          {cart.length === 0 ? <p>Aucun produit sélectionné.</p> : null}
          {cart.map((item) => (
            <div key={item.productId} className="cart-row">
              <span>{item.title}</span>
              <strong>{item.quantity}</strong>
            </div>
          ))}
          <strong>{formatMAD(totalMAD)}</strong>
        </div>
      </section>

      <section className="container grid">
        {products.length === 0 ? (
          <div className="empty-products">
            <h2>Catalogue bientôt disponible</h2>
            <p>
              Contacte la boutique sur WhatsApp pour commander les produits publiés sur Instagram.
            </p>
          </div>
        ) : null}
        {products.map((product) => (
          <article key={product.id} className="product">
            {product.images[0] ? (
              <Image
                src={product.images[0].url}
                alt={product.title}
                width={640}
                height={480}
                unoptimized
              />
            ) : (
              <div className="image-fallback" />
            )}
            <h2>{product.title}</h2>
            <p>{product.description}</p>
            {product.descriptionDarija ? <p>{product.descriptionDarija}</p> : null}
            <div className="product-footer">
              <strong>{formatMAD(product.priceMAD)}</strong>
              <button type="button" onClick={() => addProduct(product)}>
                Ajouter
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="container checkout">
        <h2>Commande COD</h2>
        <p className="checkout-copy">
          La boutique reçoit ta commande dans Jibi et te confirme les détails sur WhatsApp avant
          livraison.
        </p>
        <div className="form-grid">
          <input
            aria-label="Nom complet"
            placeholder="Nom complet"
            value={customer.fullName}
            onChange={(event) => setCustomer({ ...customer, fullName: event.target.value })}
          />
          <input
            aria-label="Téléphone"
            placeholder="+212600000000"
            value={customer.phoneE164}
            onChange={(event) => setCustomer({ ...customer, phoneE164: event.target.value })}
          />
          <input
            aria-label="Ville"
            placeholder="Ville"
            value={customer.city}
            onChange={(event) => setCustomer({ ...customer, city: event.target.value })}
          />
          <textarea
            aria-label="Adresse"
            placeholder="Adresse"
            value={customer.addressLine}
            onChange={(event) => setCustomer({ ...customer, addressLine: event.target.value })}
          />
          <textarea
            aria-label="Notes"
            placeholder="Notes: couleur, taille, disponibilité..."
            value={customer.notes}
            onChange={(event) => setCustomer({ ...customer, notes: event.target.value })}
          />
        </div>
        <button type="button" className="submit" disabled={cart.length === 0} onClick={submitOrder}>
          Confirmer {formatMAD(totalMAD)}
        </button>
        {status ? <p className="status">{status}</p> : null}
      </section>
    </main>
  );
}
