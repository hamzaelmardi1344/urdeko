import { createElement, type ReactNode } from "react";
import type { HTMLAttributes } from "react";

/**
 * Enveloppes email : `createElement('html' | 'head', …)` plutôt que du JSX, pour
 * que Next ne les associe pas au chemin `next/document` (useHtmlContext) lors
 * du static generation des pages d’erreur.
 */
type HtmlEl = HTMLAttributes<HTMLHtmlElement>;
type HeadEl = HTMLAttributes<HTMLHeadElement>;

export function UrdekoEmailDocument({ children, ...rest }: HtmlEl) {
  return createElement("html", rest, children as ReactNode);
}

export function UrdekoEmailHead({ children, ...rest }: HeadEl) {
  return createElement("head", rest, [
    createElement("meta", {
      key: "ct",
      httpEquiv: "Content-Type",
      content: "text/html; charset=UTF-8",
    }),
    createElement("meta", {
      key: "xapple",
      name: "x-apple-disable-message-reformatting",
    }),
    children as ReactNode,
  ]);
}
