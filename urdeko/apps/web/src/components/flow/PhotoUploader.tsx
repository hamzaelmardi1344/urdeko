"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@urdeko/design-system";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { uploadProjectPhotoAction } from "@/lib/actions";

export function PhotoUploader({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("La photo dépasse 20 Mo.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Merci de choisir un fichier image.");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
  };

  const submit = () => {
    const files = inputRef.current?.files;
    if (!files?.[0]) {
      setError("Ajoute une photo avant de continuer.");
      return;
    }
    const formData = new FormData();
    formData.append("photo", files[0]);
    startTransition(() => {
      void uploadProjectPhotoAction(projectId, formData);
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-6"
    >
      <label className="relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container">
        <input
          ref={inputRef}
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
          className="absolute inset-0 opacity-0"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        {preview ? (
          <img
            src={preview}
            alt="Aperçu"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-ambient">
              <Icon name="add_a_photo" size={30} />
            </div>
            <p className="font-headline text-lg font-semibold">
              Touchez pour ajouter une photo
            </p>
            <p className="text-center text-sm text-on-surface-variant/80">
              JPG, PNG, HEIC — jusqu'à 20 Mo
            </p>
          </>
        )}
      </label>

      {error ? (
        <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      ) : null}

      <div className="fixed inset-x-0 bottom-8 z-30 mx-auto w-full max-w-lg px-6">
        <SubmitButton
          label={pending ? "Envoi en cours…" : "Analyser avec l'IA"}
          icon={pending ? null : "auto_awesome"}
          disabled={pending || !preview}
        />
      </div>
    </form>
  );
}
