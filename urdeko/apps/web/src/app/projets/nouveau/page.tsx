import { InputField, Icon } from "@urdeko/design-system";
import { FlowShell } from "@/components/layout/FlowShell";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { BudgetPicker } from "@/components/flow/BudgetPicker";
import { createProjectAction } from "@/lib/actions";

export const metadata = { title: "Nouveau projet" };

export default function NewProjectPage() {
  return (
    <>
      <TopAppBar title="01 · Informations" backHref="/" />
      <FlowShell bottomPadding="cta">
        <section className="mb-10">
          <h1 className="mb-3 font-headline text-headline-md font-extrabold tracking-tight text-on-surface">
            Nommez votre projet
          </h1>
          <p className="font-body text-on-surface-variant">
            Un bon titre vous aide à retrouver votre projet dans votre tableau de bord.
          </p>
        </section>

        <form
          id="new-project-form"
          action={createProjectAction}
          className="flex flex-col gap-8"
        >
          <InputField
            label="Nom du projet"
            name="name"
            placeholder="ex. Salon cosy de Casablanca"
            required
            icon="drive_file_rename_outline"
            maxLength={80}
          />

          <BudgetPicker />
        </form>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <button
          type="submit"
          form="new-project-form"
          className="glow-gradient flex w-full items-center justify-center gap-2 rounded-lg px-7 font-headline text-[1.0625rem] font-bold tracking-tight text-on-primary-container shadow-glow transition-all active:scale-[0.98] hover:shadow-glow-sm h-14"
        >
          Continuer
          <Icon name="arrow_forward" size={20} />
        </button>
      </StickyCTA>
    </>
  );
}
