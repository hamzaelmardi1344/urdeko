"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ElementType, FormHTMLAttributes, ReactNode } from "react";

type StaggerTag = "div" | "section" | "ul" | "ol" | "form";

export type MotionStaggerProps = {
  children: ReactNode;
  delayChildren?: number;
  staggerChildren?: number;
  as?: StaggerTag;
  className?: string;
  id?: string;
  /** Requis quand `as="form"` : gère aussi les server actions. */
  action?: FormHTMLAttributes<HTMLFormElement>["action"];
  [key: string]: unknown;
};

export function MotionStagger({
  children,
  delayChildren = 0.08,
  staggerChildren = 0.06,
  as = "div",
  ...rest
}: MotionStaggerProps) {
  const reduced = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: reduced ? 1 : 0 },
    show: {
      opacity: 1,
      transition: reduced
        ? { duration: 0 }
        : { delayChildren, staggerChildren },
    },
  };
  const Tag = motion[as] as unknown as ElementType;
  return (
    <Tag initial="hidden" animate="show" variants={variants} {...rest}>
      {children}
    </Tag>
  );
}

type ItemTag = "div" | "li" | "article" | "label" | "button";

export type MotionStaggerItemProps = {
  children: ReactNode;
  as?: ItemTag;
  className?: string;
  [key: string]: unknown;
};

export function MotionStaggerItem({
  children,
  as = "div",
  ...rest
}: MotionStaggerItemProps) {
  const reduced = useReducedMotion();
  const variants: Variants = {
    hidden: reduced ? { opacity: 1 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };
  const Tag = motion[as] as unknown as ElementType;
  return (
    <Tag variants={variants} {...rest}>
      {children}
    </Tag>
  );
}
