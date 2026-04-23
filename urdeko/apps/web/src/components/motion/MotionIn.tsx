"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ElementType, ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

export type MotionInProps = Omit<
  HTMLMotionProps<"div">,
  "initial" | "animate" | "transition" | "children"
> & {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  direction?: Direction;
  as?: "div" | "section" | "article" | "header" | "main" | "li" | "ul";
};

const offset = (direction: Direction, distance: number) => {
  switch (direction) {
    case "up":
      return { y: distance, x: 0 };
    case "down":
      return { y: -distance, x: 0 };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
};

/**
 * Révélation en fade + translation. Respecte prefers-reduced-motion.
 */
export function MotionIn({
  children,
  delay = 0,
  duration = 0.45,
  distance = 14,
  direction = "up",
  as = "div",
  ...rest
}: MotionInProps) {
  const reduced = useReducedMotion();
  const initial = reduced ? { opacity: 0 } : { opacity: 0, ...offset(direction, distance) };
  const animate = reduced ? { opacity: 1 } : { opacity: 1, x: 0, y: 0 };
  const MotionTag = motion[as] as unknown as ElementType;
  return (
    <MotionTag
      initial={initial}
      animate={animate}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
