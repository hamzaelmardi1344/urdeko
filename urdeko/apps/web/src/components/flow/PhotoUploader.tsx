"use client";

import { useId, useRef, useState } from "react";
import { Icon } from "@urdeko/design-system";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { uploadProjectPhotoAction } from "@/lib/actions";
import { compressImageFileForUpload } from "@/lib/flow/compress-image-client";

/** iOS renvoie souvent type vide pour des photos HEIC / assets bibliothèque. */
function isProbablyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (file.type !== "" && file.type !== "application/octet-stream") return false;
  return /\.(heic|heif|jpe?g|png|gif|webp|bmp|tiff?)$/i.test(file.name);
}

export function PhotoUploader({ projectId }: { projectId: string }) {
  const baseId = useId();
  const cameraInputId = `${baseId}-camera`;
  const galleryInputId = `${baseId}-gallery`;
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const revokePreview = (url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  };

  const onFile = (file: File | undefined, source: "camera" | "gallery") => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("La photo dépasse 20 Mo.");
      return;
    }
    if (!isProbablyImageFile(file)) {
      setError("Merci de choisir un fichier image.");
      return;
    }
    setError(null);
    if (source === "camera" && galleryInputRef.current) galleryInputRef.current.value = "";
    if (source === "gallery" && cameraInputRef.current) cameraInputRef.current.value = "";
    setSelectedFile(file);
    setPreview((prev) => {
      revokePreview(prev);
      return URL.createObjectURL(file);
    });
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview((prev) => {
      revokePreview(prev);
      return null;
    });
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    setError(null);
  };

  const submit = async () => {
    if (!selectedFile) {
      setError("Ajoute une photo avant de continuer.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const file = await compressImageFileForUpload(selectedFile);
      const formData = new FormData();
      formData.append("photo", file);
      await uploadProjectPhotoAction(projectId, formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible, réessaie.");
      setPending(false);
    }
  };

  const choiceButtonClass =
    "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3.5 text-sm font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container active:scale-[0.99]";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-6"
    >
      {/* Hors de toute zone overflow:hidden : sinon iOS peut ne pas ouvrir le bon sélecteur. */}
      <input
        ref={cameraInputRef}
        id={cameraInputId}
        type="file"
        name="photo-camera"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0], "camera")}
      />
      <input
        ref={galleryInputRef}
        id={galleryInputId}
        type="file"
        name="photo-file"
        accept="image/*"
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0], "gallery")}
      />

      <div className="relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl bg-surface-container-low text-on-surface-variant">
        {preview ? (
          <>
            <img src={preview} alt="Aperçu" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/55 to-transparent p-4 pt-16">
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full bg-surface-container-lowest/95 px-4 py-2 text-sm font-semibold text-on-surface shadow-ambient backdrop-blur-sm"
              >
                Changer de photo
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-4 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-ambient">
              <Icon name="add_a_photo" size={28} />
            </div>
            <p className="text-center font-headline text-lg font-semibold text-on-surface">
              Caméra ou galerie
            </p>
            <p className="max-w-sm text-center text-sm text-on-surface-variant/85">
              JPG, PNG, HEIC — jusqu&apos;à 20 Mo (réduction auto avant envoi si besoin)
            </p>
            <div className="mt-1 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
              {/* Galerie en premier : souvent le besoin principal ; label htmlFor = fiable sur iOS. */}
              <label htmlFor={galleryInputId} className={choiceButtonClass}>
                <Icon name="photo_library" size={22} />
                Importer depuis la galerie
              </label>
              <label htmlFor={cameraInputId} className={choiceButtonClass}>
                <Icon name="photo_camera" size={22} />
                Prendre une photo
              </label>
            </div>
          </div>
        )}
      </div>

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
