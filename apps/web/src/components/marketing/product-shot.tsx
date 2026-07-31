import { cn } from "@theseosaas/ui/lib/utils";

/**
 * Placeholder frame for a product screenshot.
 *
 * The design ships these as hatched boxes with a monospace caption, since the
 * real captures don't exist yet. Reproduced rather than dropped: removing them
 * collapses the section layouts they anchor, and a labelled placeholder is
 * honest about what's missing where an empty div isn't.
 *
 * Swap the inner fill for an <Image> when the captures land.
 */
export function ProductShot({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-[14px] border border-[#E2E6EC]",
        className,
      )}
      style={{
        // 45° hatch, matching the design's placeholder fill.
        backgroundImage:
          "repeating-linear-gradient(45deg, #FAFBFC 0 10px, #F4F6F8 10px 20px)",
      }}
    >
      <span className="rounded-md border border-[#E2E6EC] bg-white px-2.5 py-1.5 font-mono text-[12px] text-[#6B7480]">
        {label}
      </span>
    </div>
  );
}
