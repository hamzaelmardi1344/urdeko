import Link from "next/link";
import { Icon, formatMad } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { LinkButton } from "@/components/ui/LinkButton";
import { MotionIn, MotionStagger, MotionStaggerItem } from "@/components/motion";
import { listMyProjects } from "@/lib/projects";

export const metadata = { title: "Mes projets" };

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  photo_ok: "Photo validée",
  elements_chosen: "Éléments choisis",
  products_chosen: "Produits sélectionnés",
  rendering: "En cours de rendu",
  completed: "Terminé",
  failed: "Échec",
};

export default async function ProjectsDashboardPage() {
  const projects = await listMyProjects();
  return (
    <>
      <TopAppBar showMenu />
      <FlowShell bottomPadding="nav">
        <MotionIn as="section" className="mb-8">
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Mes projets
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Tous vos projets UrdeKo, en cours et terminés.
          </p>
        </MotionIn>

        {projects.length === 0 ? (
          <MotionIn
            delay={0.1}
            className="flex flex-col items-center gap-4 rounded-2xl bg-surface-container-low p-8 text-center"
          >
            <Icon name="architecture" size={36} className="text-primary" />
            <p className="font-headline text-lg font-bold">Aucun projet pour le moment</p>
            <p className="text-sm text-on-surface-variant">
              Démarrez un premier projet pour transformer votre pièce.
            </p>
            <LinkButton href="/projets/nouveau" className="mt-2">
              Créer mon premier projet
              <Icon name="arrow_forward" size={20} />
            </LinkButton>
          </MotionIn>
        ) : (
          <MotionStagger as="ul" className="flex flex-col gap-3">
            {projects.map((project) => (
              <MotionStaggerItem as="li" key={project.id}>
                <Link
                  href={`/projets/${project.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-ambient transition-all hover:-translate-y-0.5 hover:shadow-glow-sm active:scale-[0.99]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/10 text-primary">
                    <Icon name="weekend" size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-headline text-base font-bold">
                      {project.name}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {STATUS_LABEL[project.status]} · Budget {formatMad(project.budgetMad)}
                    </p>
                  </div>
                  <Icon name="chevron_right" className="text-on-surface-variant" />
                </Link>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        )}
      </FlowShell>
      <BottomNavBar />
    </>
  );
}
