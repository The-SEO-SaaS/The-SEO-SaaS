import { cn } from "@theseosaas/ui/lib/utils";
import Image from "next/image";

/**
 * A product screenshot on the marketing page.
 *
 * Was a hatched placeholder while the captures didn't exist. Now that they do,
 * the important property is that **the frame takes its shape from the image**,
 * not the other way round. Every slot previously carried a hardcoded
 * `aspect-[16/10]` or `h-[400px]` guessed from the design file, and the real
 * captures came in at 2.25, 1.78 and 4.19 — so honouring those guesses would
 * have cropped or letterboxed all three.
 *
 * `SHOTS` holds each capture's true pixel dimensions. The wrapper sets
 * `aspect-ratio` from them, so a slot is exactly as tall as its image needs
 * and swapping in a re-shot capture only means updating the numbers here.
 *
 * `sizes` matters: these are 1.3MB of PNG between them at full width, and
 * without it Next serves the 1348px-wide source to a phone.
 */

export const SHOTS = {
  dashboard: {
    src: "/demo/dashboard.png",
    width: 1348,
    height: 598,
    alt: "The TheSEOSaaS dashboard showing an SEO score, latest audit verdict and tracked keywords.",
  },
  auditFindings: {
    src: "/demo/audit-findings.png",
    width: 1012,
    height: 569,
    alt: "An audit report listing prioritised findings with severity badges and how to fix each one.",
  },
  auditFindingsStrip: {
    src: "/demo/audit-findings-2.png",
    width: 1268,
    height: 303,
    alt: "A row of audit findings summarised by severity.",
  },
} as const;

export type ShotName = keyof typeof SHOTS;

export function ProductShot({
  shot,
  className,
  sizes = "(max-width: 1180px) 100vw, 1120px",
  priority = false,
}: {
  shot: ShotName;
  className?: string;
  sizes?: string;
  /** Set on the hero shot only — it's the one that's above the fold. */
  priority?: boolean;
}) {
  const { src, width, height, alt } = SHOTS[shot];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-[#E2E6EC] bg-white",
        className,
      )}
      // Inline rather than an `aspect-[…]` class because the ratio comes from
      // data — Tailwind can't generate a class per arbitrary runtime value.
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className="h-full w-full object-cover object-top"
      />
    </div>
  );
}
