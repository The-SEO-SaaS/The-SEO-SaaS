"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Empty, EmptyDescription, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, Lock, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { useContentLibrary } from "@/hooks/use-content";
import type { BriefSummary, ContentLibrary, HistoryEntry, PostSummary } from "@/lib/api";

/**
 * The Content library — what the product builds, not what it recommends.
 *
 * The design's two-column screen: a 232px rail carrying the library nav and
 * this month's quota, beside stacked sections. Two of the design's four
 * sections are here — AI blog briefs and AI blog posts. "Generated content"
 * (landing and feature copy) and "Content history" are a different generator
 * and are not built.
 *
 * The flow the screen is arranged around: an audit surfaces an opportunity →
 * a brief is written from it, free on every plan → the user approves the angle
 * → the full post is queued and costs one article from the month's allowance.
 * That split is why briefs and posts are separate sections rather than one
 * list with a status column.
 *
 * Responsive: the design is desktop-only. The rail moves above the sections
 * below `lg` and becomes a horizontal quota strip; row action columns collapse
 * under their titles below `sm`.
 */
export function ContentView({ projectId }: { projectId: string }) {
  const flow = useContentLibrary(projectId);
  const library = flow.library;

  if (flow.isLoading && !library) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <IconTile tone="ink" size="xl" className="animate-pulse">
          <Search />
        </IconTile>
        <span className="sr-only">Loading content</span>
      </main>
    );
  }

  if (flow.isError || !library) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 text-center">
          <IconTile tone="critical" size="xl" className="mx-auto">
            <AlertTriangle />
          </IconTile>
          <h1 className="font-display text-ink-900 text-2xl font-semibold">
            We couldn&apos;t load your content
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            {flow.errorMessage ?? "Please try again in a moment."}
          </p>
          <Button onClick={flow.refetch}>Try again</Button>
        </div>
      </main>
    );
  }

  const nextOpportunity = library.availableOpportunities[0] ?? null;

  return (
    <>
      <PageHeader
        section="Content"
        current={library.site.domain}
        meta="Every asset traces back to an audit finding or keyword gap"
        action={
          <Button
            size="sm"
            disabled={!nextOpportunity || flow.isCreatingBrief}
            onClick={() => nextOpportunity && flow.createBrief(nextOpportunity.id)}
          >
            {flow.isCreatingBrief ? "Writing brief…" : "New brief"}
          </Button>
        }
      />

      <div className="grid items-start lg:grid-cols-[232px_minmax(0,1fr)]">
        <LibraryRail library={library} />

        <div className="min-w-0 px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-7 lg:pr-9 lg:pb-14">
          {flow.briefError || flow.postError ? (
            <div className="border-critical/20 bg-critical/5 text-critical-strong mb-6 rounded-lg border px-3.5 py-2.5 text-[13px]">
              {flow.briefError ?? flow.postError}
            </div>
          ) : null}

          <BriefsSection
            briefs={library.briefs}
            opportunities={library.availableOpportunities}
            onCreateBrief={flow.createBrief}
            isCreatingBrief={flow.isCreatingBrief}
            onWritePost={flow.writePost}
            isWritingPost={flow.isWritingPost}
            canWrite={library.quota.limit === -1 || library.quota.remaining > 0}
          />

          <PostsSection posts={library.posts} projectId={projectId} />
          <PageCopySection />
          <HistorySection history={library.history} />
        </div>
      </div>
    </>
  );
}

function LibraryRail({ library }: { library: ContentLibrary }) {
  const { quota, briefs, posts } = library;
  const unlimited = quota.limit === -1;
  const percent = unlimited ? 0 : Math.min(100, Math.round((quota.used / Math.max(1, quota.limit)) * 100));

  return (
    <aside className="min-w-0 border-b border-[#EDEFF3] px-4 py-6 sm:px-6 lg:border-r lg:border-b-0 lg:px-6 lg:pt-7 lg:pb-14">
      <div className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480] uppercase">
        Library
      </div>

      <div className="mt-3.5 flex flex-col gap-px">
        <RailRow label="AI blog briefs" count={briefs.length} isActive />
        <RailRow label="AI blog posts" count={posts.length} />
      </div>

      <div className="mt-6 border-t border-[#EDEFF3] pt-[22px]">
        <div className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480] uppercase">
          This month&apos;s quota
        </div>

        <div className="mt-3 flex items-baseline gap-[7px]">
          <span className="text-[24px] leading-none font-medium tracking-[-0.02em] text-[#0B1220]">
            {quota.used}
          </span>
          <span className="text-[13px] text-[#6B7480]">
            {unlimited ? "posts written" : `of ${quota.limit} posts`}
          </span>
        </div>

        {!unlimited ? (
          <div className="mt-3 h-1 w-full overflow-hidden rounded-[2px] bg-[#F1F3F7]">
            <div className="h-full bg-[#0B1220]" style={{ width: `${percent}%` }} />
          </div>
        ) : null}

        <p className="mt-2.5 text-[11.5px] leading-[1.55] text-[#6B7480]">
          Resets {formatResetDate(quota.periodEnd)}. Briefs stay unlimited on every plan.
        </p>

        <Link
          href="/dashboard/settings"
          className="mt-3.5 inline-flex items-center gap-2 no-underline"
        >
          <span className="inline-flex items-center gap-1 rounded-[5px] border border-[#FCD9B6] bg-[#FFF6EE] px-1.5 py-px text-[10.5px] font-semibold tracking-[0.04em] text-[#EA580C]">
            <Lock className="size-[9px]" strokeWidth={2.2} />
            PRO
          </span>
          <span className="text-[12.5px] font-medium text-[#EA580C]">More posts a month</span>
        </Link>
      </div>
    </aside>
  );
}

function RailRow({
  label,
  count,
  isActive = false,
}: {
  label: string;
  count: number;
  isActive?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 rounded-[6px] px-2.5 py-2 text-[13px]",
        isActive ? "bg-[#F1F3F7] font-semibold text-[#0B1220]" : "font-normal text-[#6B7480]",
      )}
    >
      <span>{label}</span>
      <span className="text-[11.5px] font-normal text-[#6B7480]">{count}</span>
    </div>
  );
}

/** 15px title + 12.5px subtitle over a #DFE3EA rule — the design's section head. */
function SectionHead({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[#DFE3EA] pb-3">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#0B1220]">{title}</span>
        <span className="text-[12.5px] text-[#6B7480]">{subtitle}</span>
      </div>
      <span className="text-[12.5px] text-[#6B7480]">{right}</span>
    </div>
  );
}

function BriefsSection({
  briefs,
  opportunities,
  onCreateBrief,
  isCreatingBrief,
  onWritePost,
  isWritingPost,
  canWrite,
}: {
  briefs: BriefSummary[];
  opportunities: { id: string; title: string; rationale: string }[];
  onCreateBrief: (opportunityId: string) => void;
  isCreatingBrief: boolean;
  onWritePost: (briefId: string) => void;
  isWritingPost: boolean;
  canWrite: boolean;
}) {
  return (
    <section>
      <SectionHead
        title="AI blog briefs"
        subtitle="Outline and target terms, ready to write"
        right={`${briefs.length} brief${briefs.length === 1 ? "" : "s"}`}
      />

      {briefs.length > 0 ? (
        briefs.map((brief) => (
          <FadeIn
            key={brief.id}
            className="grid gap-4 border-b border-[#F3F5F8] px-0.5 py-4 sm:grid-cols-[minmax(0,1fr)_232px] sm:items-center sm:gap-5"
          >
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-[#0B1220]">{brief.title}</div>
              <div className="mt-[5px] text-[12.5px] leading-[1.55] text-[#5B6472]">
                {brief.source}
              </div>
              <div className="mt-1.5 text-[11.5px] text-[#6B7480]">
                {brief.sections.length} sections · about {brief.wordTarget} words
                {brief.angle ? ` · ${brief.angle}` : ""}
              </div>
            </div>

            <div className="flex items-center gap-3 sm:justify-end">
              {brief.hasPost ? (
                <span className="text-[12.5px] whitespace-nowrap text-[#6B7480]">
                  Post written
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isWritingPost || !canWrite}
                  onClick={() => onWritePost(brief.id)}
                  title={canWrite ? undefined : "You've used this month's posts."}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#FCD9B6] bg-[#FFFBF6] px-3 py-[7px] text-[12.5px] font-medium whitespace-nowrap text-[#EA580C] disabled:opacity-50"
                >
                  <Lock className="size-[11px]" strokeWidth={2} />
                  {isWritingPost ? "Queueing…" : "Write full post"}
                </button>
              )}
            </div>
          </FadeIn>
        ))
      ) : (
        <Empty className="mt-4 rounded-2xl border border-[#E2E6EC]">
          <EmptyTitle>No briefs yet</EmptyTitle>
          <EmptyDescription>
            {opportunities.length > 0
              ? "Your audit found opportunities worth writing about. Turn one into an outline."
              : "Run an audit to surface the gaps worth writing about."}
          </EmptyDescription>
          {opportunities[0] ? (
            <Button
              size="sm"
              className="mt-3"
              disabled={isCreatingBrief}
              onClick={() => onCreateBrief(opportunities[0]!.id)}
            >
              {isCreatingBrief ? "Writing brief…" : "Write a brief"}
            </Button>
          ) : null}
        </Empty>
      )}

      <p className="mt-2.5 text-[12px] leading-[1.55] text-[#6B7480]">
        Briefs are free. Writing the full post uses your monthly quota and needs an active
        subscription.
      </p>
    </section>
  );
}

const STATUS_LABEL: Record<PostSummary["status"], string> = {
  DRAFT: "Draft",
  GENERATING: "Writing…",
  GENERATED: "Ready to publish",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  FAILED: "Failed",
};

const STATUS_COLOUR: Record<PostSummary["status"], string> = {
  DRAFT: "#9AA2AE",
  GENERATING: "#EA580C",
  GENERATED: "#0B1220",
  PUBLISHED: "#16A34A",
  ARCHIVED: "#9AA2AE",
  FAILED: "#DC2626",
};

function PostsSection({ posts, projectId }: { posts: PostSummary[]; projectId: string }) {
  return (
    <section className="mt-9">
      <SectionHead
        title="AI blog posts"
        subtitle="Written from a brief, ready to publish or export"
        right={`${posts.length} post${posts.length === 1 ? "" : "s"}`}
      />

      {posts.length > 0 ? (
        posts.map((post) => (
          <div
            key={post.id}
            className="grid gap-3 border-b border-[#F3F5F8] px-0.5 py-4 sm:grid-cols-[minmax(0,1fr)_148px_112px] sm:items-center sm:gap-5"
          >
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-[#0B1220]">{post.title}</div>
              <div className="mt-[5px] text-[12.5px] leading-[1.55] text-[#5B6472]">
                {post.source}
              </div>
              <div className="mt-1.5 text-[11.5px] text-[#6B7480]">
                {post.wordCount ? `${post.wordCount.toLocaleString()} words · ` : ""}
                {formatDate(post.createdAt)}
              </div>
              {post.status === "FAILED" && post.lastError ? (
                <div className="text-critical mt-1.5 text-[11.5px]">{post.lastError}</div>
              ) : null}
            </div>

            <div className="flex items-center gap-[7px]">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  post.status === "GENERATING" && "animate-pulse",
                )}
                style={{ background: STATUS_COLOUR[post.status] }}
              />
              <span className="text-[12.5px] text-[#3F4854]">{STATUS_LABEL[post.status]}</span>
            </div>

            <div className="text-[12.5px] font-medium sm:text-right">
              {post.status === "GENERATED" ||
              post.status === "PUBLISHED" ||
              post.status === "ARCHIVED" ? (
                <Link href={`/dashboard/${projectId}/content/${post.id}`}>Open</Link>
              ) : (
                <span className="text-[#9AA2AE]">—</span>
              )}
            </div>
          </div>
        ))
      ) : (
        <Empty className="mt-4 rounded-2xl border border-[#E2E6EC]">
          <EmptyTitle>No posts written yet</EmptyTitle>
          <EmptyDescription>
            Approve a brief above and we&apos;ll write the full article from it.
          </EmptyDescription>
        </Empty>
      )}
    </section>
  );
}

/**
 * The design's "Generated content" section — landing and feature page copy.
 *
 * Page copy is a different generator from the article writer: different
 * prompt, different output shape, different review flow. It isn't built, and
 * this says so plainly rather than rendering an empty table that looks broken.
 */
function PageCopySection() {
  return (
    <section className="mt-9">
      <SectionHead
        title="Generated content"
        subtitle="Landing and feature copy from opportunity modules"
        right="Coming soon"
      />

      <div className="mt-4 rounded-2xl border border-dashed border-[#E2E6EC] px-5 py-6">
        <p className="max-w-[64ch] text-[13px] leading-[1.6] text-[#6B7480]">
          Your audit already finds feature and landing page opportunities — they&apos;re listed on
          the dashboard. Writing the page copy for them is a separate generator and isn&apos;t
          built yet. Blog briefs and posts above are unaffected.
        </p>
      </div>
    </section>
  );
}

/** Everything ever generated for this site, newest first. */
function HistorySection({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <section className="mt-9">
      <SectionHead
        title="Content history"
        subtitle="Everything generated, newest first"
        right={`${history.length} item${history.length === 1 ? "" : "s"}`}
      />

      {history.map((entry) => {
        const row = (
          <>
            <span className="text-[12.5px] text-[#6B7480]">{formatDate(entry.createdAt)}</span>
            <span className="truncate text-[13.5px] font-medium text-[#0B1220]">
              {entry.title}
            </span>
            <span className="text-[12.5px] text-[#6B7480]">{entry.type}</span>
            <span className="flex items-center gap-[7px] sm:justify-end">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: STATUS_COLOUR[entry.status] }}
              />
              <span className="text-[12.5px] text-[#3F4854]">{STATUS_LABEL[entry.status]}</span>
            </span>
          </>
        );

        const className =
          "grid items-center gap-x-4 gap-y-1 border-b border-[#F3F5F8] px-0.5 py-3 sm:grid-cols-[68px_minmax(0,1fr)_116px_120px]";

        return entry.href ? (
          <Link key={entry.id} href={entry.href} className={cn(className, "no-underline")}>
            {row}
          </Link>
        ) : (
          <div key={entry.id} className={className}>
            {row}
          </div>
        );
      })}
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatResetDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}
