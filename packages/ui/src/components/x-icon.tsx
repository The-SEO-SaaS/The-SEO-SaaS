import type { SVGProps } from "react";

/**
 * The X (formerly Twitter) mark.
 *
 * Hand-rolled rather than pulled from an icon set: lucide dropped its Twitter
 * glyph and has no X replacement, and adding a second icon dependency for one
 * path would be a poor trade.
 *
 * `currentColor` and a 24-box viewBox so it behaves exactly like every lucide
 * icon at the call site — `className="size-4"` works, and it inherits colour
 * from its parent. Filled, not stroked, because the real mark is solid; a
 * stroked version reads as a hand-drawn approximation next to the outline icons
 * it sits beside.
 */
export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}
