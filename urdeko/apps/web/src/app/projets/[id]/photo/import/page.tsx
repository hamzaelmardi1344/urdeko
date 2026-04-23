import { TopAppBar } from "@/components/layout/TopAppBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { PhotoUploader } from "@/components/flow/PhotoUploader";

export const metadata = { title: "Importer votre photo" };

export default async function PhotoImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <TopAppBar title="03 · Photo" backHref={`/projets/${id}/photo/guide`} />
      <FlowShell bottomPadding="cta">
        <section className="mb-10">
          <h1 className="mb-3 font-headline text-headline-md font-extrabold tracking-tight">
            Ajoutez la photo de votre pièce
          </h1>
          <p className="font-body text-on-surface-variant">
            Prenez une photo avec votre téléphone ou importez un fichier existant.
          </p>
        </section>

        <PhotoUploader projectId={id} />
      </FlowShell>
    </>
  );
}
