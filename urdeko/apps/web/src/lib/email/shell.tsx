import type { JSX, ReactNode } from "react";

type HtmlProps = JSX.IntrinsicElements["html"];
type HeadProps = JSX.IntrinsicElements["head"];

/**
 * Enveloppe email sans importer `Html` / `Head` depuis `@react-email/components` :
 * certains builds Next résolvent `Html` vers `next/document` et déclenchent useHtmlContext().
 */
export function UrdekoEmailDocument({ children, ...rest }: HtmlProps) {
  return <html {...rest}>{children as ReactNode}</html>;
}

export function UrdekoEmailHead({ children, ...rest }: HeadProps) {
  return (
    <head {...rest}>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="x-apple-disable-message-reformatting" />
      {children as ReactNode}
    </head>
  );
}
