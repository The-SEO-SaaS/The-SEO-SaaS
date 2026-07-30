import { cn } from "@theseosaas/ui/lib/utils";

/**
 * Section header shared by the keywords and competitors pages.
 *
 * The design puts a breadcrumb and a right-aligned meta line + action in a
 * bar under the top nav. Below `sm` that stacks, since a breadcrumb, a quota
 * line and a button don't fit on one phone row without truncating the part
 * that matters.
 */
export function PageHeader({
  title,
  meta,
  action,
  className,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10",
        className,
      )}
    >
      <h1 className="font-display text-ink-900 text-lg font-semibold tracking-tight">
        {title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {meta ? <span className="text-ink-400 text-sm">{meta}</span> : null}
        {action}
      </div>
    </div>
  );
}
