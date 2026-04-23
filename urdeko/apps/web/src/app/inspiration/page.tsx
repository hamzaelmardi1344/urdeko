import { Icon } from "@urdeko/design-system";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { FlowShell } from "@/components/layout/FlowShell";
import { STYLES } from "@/lib/domain";

export const metadata = { title: "Inspiration" };

export default function InspirationPage() {
  return (
    <>
      <TopAppBar showMenu />
      <FlowShell bottomPadding="nav">
        <section className="mb-8">
          <h1 className="font-headline text-headline-md font-extrabold tracking-tight">
            Inspiration
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Parcourez les ambiances UrdeKo pour nourrir votre projet.
          </p>
        </section>

        <ul className="grid grid-cols-2 gap-4">
          {STYLES.map((style) => (
            <li
              key={style.id}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-container-low"
            >
              <img
                alt={style.label}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                src={style.image}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                <p className="font-headline text-base font-bold">{style.label}</p>
                <p className="text-xs opacity-80 line-clamp-2">{style.description}</p>
              </div>
              <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
                <Icon name="bookmark_border" size={18} />
              </span>
            </li>
          ))}
        </ul>
      </FlowShell>
      <BottomNavBar />
    </>
  );
}
