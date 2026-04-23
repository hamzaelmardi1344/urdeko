import { Icon } from "@urdeko/design-system";
import { FlowShell } from "@/components/layout/FlowShell";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { LinkButton } from "@/components/ui/LinkButton";

const BENEFITS = [
  { icon: "photo_camera", text: "À partir de votre vraie photo" },
  { icon: "tune", text: "Produits sélectionnés selon vos préférences" },
  { icon: "account_balance_wallet", text: "Budget maîtrisé" },
] as const;

export default function HomePage() {
  return (
    <>
      <FlowShell bottomPadding="nav-cta">
        <section className="mb-12">
          <h1 className="mb-6 max-w-[15ch] font-display text-[2.1rem] font-extrabold leading-[1.1] tracking-tight text-on-surface">
            Transformez votre pièce à partir d'une{" "}
            <span className="bg-glow-gradient bg-clip-text text-transparent">simple photo</span>
          </h1>
          <p className="font-body text-lg leading-relaxed text-on-surface-variant">
            Recevez une proposition d'aménagement personnalisée selon votre pièce, votre style et
            votre budget.
          </p>
        </section>

        <section className="mb-14">
          <div className="relative flex flex-col gap-3 rounded-2xl bg-surface-container-low p-3">
            <div className="relative h-48 w-full overflow-hidden rounded-lg">
              <img
                className="h-full w-full object-cover"
                alt="Pièce vide avant transformation UrdeKo"
                src="/images/hero-before.jpg"
                loading="eager"
                fetchPriority="high"
              />
              <span className="absolute left-4 top-4 rounded-full frosted-pane px-4 py-1.5 font-label text-xs font-bold uppercase tracking-widest text-on-surface shadow-sm">
                Avant
              </span>
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-container-lowest p-2 shadow-[0_4px_20px_-2px_rgba(46,47,45,0.1)]">
              <Icon
                name="keyboard_double_arrow_down"
                filled
                className="text-primary-container"
              />
            </div>
            <div className="relative h-64 w-full overflow-hidden rounded-lg">
              <img
                className="h-full w-full object-cover"
                alt="Même pièce aménagée par l'IA UrdeKo"
                src="/images/hero-after.jpg"
                loading="eager"
                fetchPriority="high"
              />
              <span className="absolute left-4 top-4 rounded-full bg-primary-container px-4 py-1.5 font-label text-xs font-bold uppercase tracking-widest text-on-primary-container shadow-sm">
                Après
              </span>
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-medium text-on-surface-variant/70">
            Exemple réel généré par notre IA — même pièce, meublée en 1 clic.
          </p>
        </section>

        <section className="flex flex-col gap-8">
          {BENEFITS.map((benefit) => (
            <div key={benefit.icon} className="flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary">
                <Icon name={benefit.icon} size={28} />
              </div>
              <p className="font-headline text-lg font-semibold leading-tight text-on-surface">
                {benefit.text}
              </p>
            </div>
          ))}
        </section>
      </FlowShell>

      <StickyCTA>
        <LinkButton href="/projets/nouveau">
          Commencer mon projet
          <Icon name="arrow_forward" size={20} />
        </LinkButton>
      </StickyCTA>
    </>
  );
}
