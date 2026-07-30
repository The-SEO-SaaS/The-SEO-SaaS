/**
 * The logo glyph: a magnifier with a plus inside it.
 *
 * Traced from the design file rather than substituted with lucide's `Search`,
 * which was the previous stand-in and is a different shape — no plus, different
 * proportions. The exact geometry matters because this sits at 14px inside a
 * 28px tile on every page, so any drift reads as a different brand.
 */
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="8.6" cy="8.6" r="5" />
      <path d="M16.2 16.2L12.6 12.6" />
      <path d="M8.6 6.4V10.8M6.4 8.6H10.8" />
    </svg>
  );
}
