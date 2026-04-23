"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ElementType, ReactNode } from "react";

type CardTag = "div" | "label" | "article" | "li" | "button";

export type MotionCardProps = {
  children: ReactNode;
  pressable?: boolean;
  as?: CardTag;
  className?: string;
  [key: string]: unknown;
};

export function MotionCard({
  children,
  pressable = true,
  as = "div",
  ...rest
}: MotionCardProps) {
  const reduced = useReducedMotion();
  const hover = reduced ? undefined : { y: -3, scale: 1.01 };
  const tap = reduced || !pressable ? undefined : { scale: 0.97 };
  const Tag = motion[as] as unknown as ElementType;
  return (
    <Tag
      whileHover={hover}
      whileTap={tap}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
