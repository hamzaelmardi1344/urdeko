import * as React from "react";
import { cn } from "../utils/cn";

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  filled?: boolean;
  size?: number;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
}

/**
 * Material Symbols Outlined wrapper.
 * Utilise une police de glyphes chargee au niveau layout.
 */
export function Icon({
  name,
  filled = false,
  size,
  weight = 400,
  className,
  style,
  ...props
}: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined leading-none", className)}
      style={{
        fontSize: size ? `${size}px` : undefined,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}`,
        ...style,
      }}
      {...props}
    >
      {name}
    </span>
  );
}
