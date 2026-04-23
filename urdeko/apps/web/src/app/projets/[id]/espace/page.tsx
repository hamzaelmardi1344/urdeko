import { Icon } from "@urdeko/design-system";
import { FlowShell } from "@/components/layout/FlowShell";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { StickyCTA } from "@/components/layout/StickyCTA";
import { MotionIn, MotionStagger, MotionStaggerItem } from "@/components/motion";
import { ROOM_TYPES } from "@/lib/domain";
import { getProjectOrThrow } from "@/lib/projects";
import { selectRoomTypeAction } from "@/lib/actions";

export const metadata = { title: "Type d'espace" };

export default async function RoomTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrThrow(id);
  const action = selectRoomTypeAction.bind(null, id);

  return (
    <>
      <TopAppBar title="02 · Espace" backHref={`/projets/${id}`} />
      <FlowShell bottomPadding="cta">
        <MotionIn as="section" className="mb-10">
          <h1 className="mb-3 font-headline text-headline-md font-extrabold tracking-tight">
            Quel espace transformer ?
          </h1>
          <p className="font-body text-on-surface-variant">
            Cette information aide notre IA à calibrer les proportions et le mobilier.
          </p>
        </MotionIn>

        <MotionStagger
          as="form"
          id="room-form"
          action={action}
          className="grid grid-cols-2 gap-4"
        >
          {ROOM_TYPES.map((room) => (
            <MotionStaggerItem
              as="label"
              key={room.id}
              className="group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl bg-surface-container-low p-6 transition-all hover:-translate-y-0.5 hover:shadow-ambient has-[:checked]:bg-primary-container has-[:checked]:text-on-primary-container has-[:checked]:shadow-glow-sm"
            >
              <input
                type="radio"
                name="roomType"
                value={room.id}
                defaultChecked={project.roomType === room.id}
                className="peer sr-only"
                required
              />
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-lowest text-primary transition-colors peer-checked:[&]:bg-on-primary-container/10 peer-checked:[&]:text-on-primary-container">
                <Icon name={room.icon} size={28} />
              </span>
              <span className="font-headline text-sm font-semibold tracking-tight">
                {room.label}
              </span>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </FlowShell>

      <StickyCTA offset="bottom-8">
        <button
          type="submit"
          form="room-form"
          className="glow-gradient flex h-14 w-full items-center justify-center gap-2 rounded-lg px-7 font-headline text-[1.0625rem] font-bold tracking-tight text-on-primary-container shadow-glow transition-all active:scale-[0.98]"
        >
          Continuer
          <Icon name="arrow_forward" size={20} />
        </button>
      </StickyCTA>
    </>
  );
}
