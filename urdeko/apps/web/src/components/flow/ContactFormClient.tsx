"use client";

import { useState } from "react";
import { InputField, Toggle } from "@urdeko/design-system";
import type { Contact } from "@/lib/db/schema";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  contact: Contact | null;
};

export function ContactFormClient({ action, contact }: Props) {
  const [wantsEmail, setWantsEmail] = useState(contact?.wantsEmail ?? true);
  const [wantsCallback, setWantsCallback] = useState(contact?.wantsCallback ?? false);

  return (
    <form id="contact-form" action={action} className="flex flex-col gap-6">
      <InputField
        label="Nom complet"
        name="fullName"
        icon="person"
        defaultValue={contact?.fullName ?? ""}
        required
      />
      <InputField
        label="Email"
        name="email"
        type="email"
        icon="mail"
        defaultValue={contact?.email ?? ""}
        required
      />
      <InputField
        label="Ville"
        name="city"
        icon="location_city"
        defaultValue={contact?.city ?? ""}
        required
      />
      <InputField
        label="Téléphone (optionnel)"
        name="phone"
        icon="phone"
        defaultValue={contact?.phone ?? ""}
      />

      <div className="flex flex-col gap-3">
        <Toggle
          label="M'envoyer le rendu par email"
          checked={wantsEmail}
          onChange={setWantsEmail}
        />
        <input type="hidden" name="wantsEmail" value={wantsEmail ? "on" : "false"} />
        <Toggle
          label="Être rappelé par un conseiller UrdeKo"
          checked={wantsCallback}
          onChange={setWantsCallback}
        />
        <input type="hidden" name="wantsCallback" value={wantsCallback ? "on" : "false"} />
      </div>
    </form>
  );
}
