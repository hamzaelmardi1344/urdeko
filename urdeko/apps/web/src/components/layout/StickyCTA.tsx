import { cn } from "@urdeko/design-system";

export function StickyCTA({
  children,
  offset = "bottom-[104px]",
  className,
}: {
  children: React.ReactNode;
  offset?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 mx-auto w-full max-w-lg px-6",
        offset,
        className,
      )}
    >
      {children}
    </div>
  );
}
