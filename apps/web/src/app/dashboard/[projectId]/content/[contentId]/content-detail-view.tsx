"use client";

import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { Markdown } from "@theseosaas/ui/components/markdown";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, Check, Copy, Download, Info, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  ContentChecklist,
  progressPercentFor,
  useContentProgressSteps,
} from "@/components/content/content-checklist";
import { useContentItem } from "@/hooks/use-content";
import type { ContentDetail } from "@/lib/api";

/**
 * One generated post — the design's `/blog/[slug]` screen.
 *
 * The point of the screen is stated in the design's own annotation: "markdown
 * only, copy and paste into their stack". So the two things it must do
 * perfectly are render the article beautifully and hand over the source
 * unaltered. Preview and Markdown are the same string; the toggle only changes
 * how it's displayed.
 *
 * Export beyond plain .md — MDX, Contentful, WordPress — is not built, and the
 * amber note says so rather than leaving the user to discover it.
 *
 * Responsive: the design is desktop-only. The toolbar wraps to two rows below
 * `md`, the prose column keeps the design's 720px measure but drops to 15.5px
 * body on phones, and tables inside the article scroll rather than crush.
 */
export function ContentDetailView({
  projectId,
  contentId,
}: {
  projectId: string;
  contentId: string;
}) {
  const flow = useContentItem(contentId);
  const [mode, setMode] = React.useState<"preview" | "markdown">("preview");
  const item = flow.item;

  /**
   * "What is this section for?" per heading — the strategy behind the post,
   * surfaced inline rather than left for the reader to infer. The title
   * itself explains the article's overall angle and target keyword(s); each
   * H2 explains what that section specifically had to establish, straight
   * from the outline the model wrote it to (see `angle` / `sections` on
   * `ContentDetail`, sourced from the brief's own JSON — nothing here is
   * invented after the fact).
   *
   * Keyed by literal heading text, matching how `Markdown` looks entries up.
   */
  const annotations = React.useMemo(() => {
    if (!item) return undefined;

    const map: Record<string, React.ReactNode> = {};

    if (item.angle) {
      map[item.title.trim()] = (
        <>
          <span className="text-ink-900 block text-[11px] font-semibold tracking-[0.06em] uppercase">
            Strategy
          </span>
          <span className="mt-1 block">{item.angle}</span>
          {item.keywords.length > 0 ? (
            <span className="mt-2 block text-[#6B7480]">
              Targets{" "}
              {item.keywords.map((keyword, index) => (
                <React.Fragment key={keyword}>
                  {index > 0 ? ", " : ""}
                  <span className="rounded-[3px] bg-[#F1F3F7] px-[4px] py-px font-mono text-[11.5px]">
                    {keyword}
                  </span>
                </React.Fragment>
              ))}
            </span>
          ) : null}
        </>
      );
    }

    for (const section of item.sections) {
      map[section.heading.trim()] = (
        <>
          <span className="text-ink-900 block text-[11px] font-semibold tracking-[0.06em] uppercase">
            This section
          </span>
          <span className="mt-1 block">{section.covers}</span>
        </>
      );
    }

    return map;
  }, [item]);

  if (flow.isLoading && !item) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <IconTile tone="ink" size="xl" className="animate-pulse">
          <Search />
        </IconTile>
        <span className="sr-only">Loading post</span>
      </main>
    );
  }

  if (flow.isError || !item) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 text-center">
          <IconTile tone="critical" size="xl" className="mx-auto">
            <AlertTriangle />
          </IconTile>
          <h1 className="font-display text-ink-900 text-2xl font-semibold">
            We couldn&apos;t load this post
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            {flow.errorMessage ?? "Please try again in a moment."}
          </p>
          <Button onClick={flow.refetch}>Try again</Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <Toolbar
        item={item}
        projectId={projectId}
        mode={mode}
        onModeChange={setMode}
        onPublish={() => flow.setStatus(item.status === "PUBLISHED" ? "GENERATED" : "PUBLISHED")}
        isUpdatingStatus={flow.isUpdatingStatus}
      />

      {item.body ? (
        <>
          <FrameworkNote />

          <main className="flex justify-center px-4 py-10 sm:px-8 lg:px-12 lg:pt-12 lg:pb-15">
            <div className="w-full max-w-[720px] min-w-0">
              {mode === "preview" ? (
                <FadeIn>
                  {item.metaDescription ? (
                    <p className="mb-6 text-[14px] leading-[1.7] text-[#5B6472] italic sm:text-[15px]">
                      {item.metaDescription}
                    </p>
                  ) : null}

                  <Markdown annotations={annotations}>{item.body}</Markdown>

                  <hr className="my-[34px] border-0 border-t border-[#E2E6EC]" />

                  <p className="text-[14px] leading-[1.7] text-[#5B6472] sm:text-[15px]">
                    Generated by TheSEOSaaS from{" "}
                    <span className="rounded-[4px] bg-[#F1F3F7] px-[5px] py-px font-mono text-[13.5px]">
                      {item.keywords[0] ?? "your audit"}
                    </span>
                    {item.wordCount ? ` — ${item.wordCount.toLocaleString()} words.` : "."}
                  </p>
                </FadeIn>
              ) : (
                <pre className="overflow-x-auto rounded-xl border border-[#E2E6EC] bg-[#FAFAFB] p-4 font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap text-[#28303C] sm:p-6 sm:text-[13px]">
                  {item.body}
                </pre>
              )}
            </div>
          </main>
        </>
      ) : (
        <PendingBody item={item} projectId={projectId} />
      )}
    </>
  );
}

function Toolbar({
  item,
  projectId,
  mode,
  onModeChange,
  onPublish,
  isUpdatingStatus,
}: {
  item: ContentDetail;
  projectId: string;
  mode: "preview" | "markdown";
  onModeChange: (mode: "preview" | "markdown") => void;
  onPublish: () => void;
  isUpdatingStatus: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#EDEFF3] bg-[#FAFAFB] px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6 lg:px-8">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <Link
          href={`/dashboard/${projectId}/content`}
          className="text-[13px] font-normal whitespace-nowrap text-[#6B7480]"
        >
          Content
        </Link>
        <span className="text-[13px] text-[#D3D8E0]">/</span>
        <span className="text-[13px] whitespace-nowrap text-[#6B7480]">AI blog posts</span>
        <span className="hidden text-[13px] text-[#D3D8E0] sm:inline">/</span>
        <span className="hidden min-w-0 truncate text-[13px] font-medium text-[#0B1220] sm:inline">
          {item.title}
        </span>
        <StatusPill item={item} />
      </div>

      {item.body ? (
        <div className="flex flex-wrap items-center gap-3 md:shrink-0">
          <div className="flex items-center gap-0.5 rounded-lg bg-[#F1F3F7] p-[3px]">
            {(["preview", "markdown"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onModeChange(option)}
                className={cn(
                  "rounded-[6px] px-3 py-[5px] text-[12.5px] capitalize",
                  mode === option
                    ? "bg-white font-medium text-[#0B1220] shadow-[0_1px_2px_rgba(11,18,32,0.06)]"
                    : "text-[#6B7480]",
                )}
              >
                {option}
              </button>
            ))}
          </div>

          <DownloadButton item={item} />
          <CopyButton body={item.body} />

          <button
            type="button"
            onClick={onPublish}
            disabled={isUpdatingStatus}
            className="text-[12.5px] font-medium whitespace-nowrap text-[#6B7480] disabled:opacity-50"
          >
            {item.status === "PUBLISHED" ? "Mark unpublished" : "Mark published"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ item }: { item: ContentDetail }) {
  const label =
    item.status === "GENERATING"
      ? "Writing"
      : item.status === "PUBLISHED"
        ? "Published"
        : item.status === "FAILED"
          ? "Failed"
          : item.status === "ARCHIVED"
            ? "Archived"
            : "Ready to publish";

  const colour = item.status === "FAILED" ? "#DC2626" : "#0B1220";

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#DDE1E7] bg-[#F1F3F7] px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-[#0B1220]">
      <span
        className={cn("size-[5px] rounded-full", item.status === "GENERATING" && "animate-pulse")}
        style={{ background: colour }}
      />
      {label}
    </span>
  );
}

/** The design's amber strip. It is a promise about scope, so it stays. */
function FrameworkNote() {
  return (
    <div className="flex items-start gap-2.5 border-b border-[#F5E4CE] bg-[#FFFBF5] px-4 py-3 sm:items-center sm:px-6 lg:px-8">
      <Info className="mt-px size-3.5 shrink-0 text-[#B45309] sm:mt-0" />
      <span className="text-[12.5px] leading-[1.55] text-[#7C3D12]">
        Plain markdown only — headings, lists, tables, quotes and links. Your site&apos;s own
        styles take over once it&apos;s pasted in. Framework-specific export (MDX, Contentful,
        WordPress) is coming.
      </span>
    </div>
  );
}

function CopyButton({ body }: { body: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(body);
          setCopied(true);
        } catch {
          // Clipboard access can be refused (insecure origin, permissions).
          // The Markdown tab is the fallback — the text is selectable there.
          setCopied(false);
        }
      }}
      className="inline-flex items-center gap-[7px] rounded-lg bg-[#0B1220] px-[15px] py-[9px] text-[12.5px] font-medium whitespace-nowrap text-white"
    >
      {copied ? <Check className="size-[13px]" /> : <Copy className="size-[13px]" />}
      {copied ? "Copied" : "Copy markdown"}
    </button>
  );
}

function DownloadButton({ item }: { item: ContentDetail }) {
  return (
    <button
      type="button"
      onClick={() => {
        // Built and revoked here rather than held in state: the blob is only
        // needed for the instant the click lasts.
        const blob = new Blob([item.body ?? ""], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${slugify(item.title)}.md`;
        link.click();
        URL.revokeObjectURL(url);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFE3EA] bg-white px-[13px] py-2 text-[12.5px] font-medium whitespace-nowrap text-[#3F4854]"
    >
      <Download className="size-[13px]" />
      Download .md
    </button>
  );
}

/**
 * The generating state, branded to match the audit's own crawl screen — same
 * centred 660px column, eyebrow, progress rail and step checklist — rather
 * than the plain spinner-and-caption card this used to be. Writing a post is
 * the other multi-minute wait in the product, so it should feel like the
 * other one: work happening, not a page that's stalled.
 *
 * This *is* the redirect target: `writeFullPost` sends the browser here the
 * instant generation is queued, and `useContentItem`'s polling swaps this out
 * for the finished article in place, with no second navigation needed.
 */
function PendingBody({ item, projectId }: { item: ContentDetail; projectId: string }) {
  const isFailed = item.status === "FAILED";
  const activeStep = useContentProgressSteps(!isFailed);

  if (isFailed) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 text-center">
          <IconTile tone="critical" size="xl" className="mx-auto">
            <AlertTriangle />
          </IconTile>
          <h1 className="font-display text-ink-900 text-2xl font-semibold">
            This post couldn&apos;t be written
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            {item.lastError ??
              "Something went wrong during generation. Your monthly allowance wasn't charged."}
          </p>
          <Button variant="outline" render={<Link href={`/dashboard/${projectId}/content`} />}>
            Back to content
          </Button>
        </div>
      </main>
    );
  }

  const pct = progressPercentFor(activeStep);

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10 sm:py-16">
      <div className="w-full max-w-[660px]">
        <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
          WRITING YOUR POST
        </div>

        <div className="mt-3.5 flex items-baseline justify-between gap-5">
          <div className="text-ink-900 truncate text-[22px] font-medium tracking-[-0.025em] sm:text-[26px]">
            {item.title}
          </div>
          <div className="shrink-0 text-[13px] text-[#6B7480]">{pct}%</div>
        </div>

        <div className="mt-4 h-1 w-full overflow-hidden rounded-sm bg-[#F1F3F7]">
          <div
            className="bg-ink-900 h-full transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ContentChecklist className="mt-[30px]" activeIndex={activeStep} />

        <p className="mt-6 text-[12.5px] leading-[1.55] text-[#6B7480]">
          This takes a minute or two. You don&apos;t need to stay on this page — it&apos;ll be
          here, finished, whenever you come back.
        </p>

        <Button
          variant="outline"
          className="mt-5"
          render={<Link href={`/dashboard/${projectId}/content`} />}
        >
          Back to content
        </Button>
      </div>
    </main>
  );
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  );
}
