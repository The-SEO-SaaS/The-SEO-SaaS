"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Empty, EmptyDescription, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, ArrowUpRight, PenLine, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { useContentLibrary } from "@/hooks/use-content";
import type { ContentLibrary, HistoryEntry, PostSummary } from "@/lib/api";

/**
 * The Content library — what the product builds, not what it recommends.
 *
 * The design's two-column screen: a 232px rail carrying the library nav and
 * this month's quota, beside stacked sections. "Generated content" (landing
 * and feature copy) and "Content history" are a different generator and are
 * not built.
 *
 * The design's other section was "AI blog briefs" — a free outline the user
 * approved before the full post was queued. That approval step made sense
 * when anyone could see a brief for free and decide whether it was worth a
 * post; now the whole app sits behind a subscription, so there's no one left
 * to show a brief to who hasn't already committed. "Write a blog post" now
 * does both calls — brief, then post — in one click, and the brief itself is
 * never surfaced. See `useContentLibrary.writePost`.
 *
 * Responsive: the design is desktop-only. The rail moves above the sections
 * below `lg` and becomes a horizontal quota strip; row action columns collapse
 * under their titles below `sm`.
 */
export function ContentView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const flow = useContentLibrary(projectId);
  const library = flow.library;

  const canWrite = library ? library.quota.limit === -1 || library.quota.remaining > 0 : false;

  const write = async (opportunityId: string) => {
    const contentId = await flow.writePost(opportunityId);
    // The post exists now and is generating — the detail page shows that
    // progress itself (see PendingBody in content-detail-view.tsx) and swaps
    // to the finished article in place once it's ready, so this is the only
    // navigation the whole flow needs.
    if (contentId) router.push(`/dashboard/${projectId}/content/${contentId}`);
  };

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
        meta="Every post traces back to an audit finding or keyword gap"
        action={
          <Button
            size="sm"
            disabled={!nextOpportunity || flow.isWritingPost || !canWrite}
            onClick={() => nextOpportunity && write(nextOpportunity.id)}
            title={canWrite ? undefined : "You've used this month's posts."}
          >
            <PenLine />
            {flow.isWritingPost ? "Writing…" : "Write a blog post"}
          </Button>
        }
      />

      <div className="grid items-start lg:grid-cols-[232px_minmax(0,1fr)]">
        <LibraryRail library={library} />

        <div className="min-w-0 px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-7 lg:pr-9 lg:pb-14">
          {flow.writeError ? (
            <div className="border-critical/20 bg-critical/5 text-critical-strong mb-6 rounded-lg border px-3.5 py-2.5 text-[13px]">
              {flow.writeError}
            </div>
          ) : null}

          <PostsSection
            posts={library.posts}
            projectId={projectId}
            nextOpportunity={nextOpportunity}
            onWrite={write}
            isWriting={flow.isWritingPost}
            canWrite={canWrite}
          />
          <PageCopySection />
          <HistorySection history={library.history} />
        </div>
      </div>
    </>
  );
}

function LibraryRail({ library }: { library: ContentLibrary }) {
  const { quota, posts } = library;
  const unlimited = quota.limit === -1;
  const percent = unlimited ? 0 : Math.min(100, Math.round((quota.used / Math.max(1, quota.limit)) * 100));

  return (
    <aside className="min-w-0 border-b border-[#EDEFF3] px-4 py-6 sm:px-6 lg:border-r lg:border-b-0 lg:px-6 lg:pt-7 lg:pb-14">
      <div className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480] uppercase">
        Library
      </div>

      <div className="mt-3.5 flex flex-col gap-px">
        <RailRow label="AI blog posts" count={posts.length} isActive />
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
          Resets {formatResetDate(quota.periodEnd)}. Each post uses one from this allowance.
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

function PostsSection({
  posts,
  projectId,
  nextOpportunity,
  onWrite,
  isWriting,
  canWrite,
}: {
  posts: PostSummary[];
  projectId: string;
  nextOpportunity: { id: string; title: string; rationale: string } | null;
  onWrite: (opportunityId: string) => void;
  isWriting: boolean;
  canWrite: boolean;
}) {
  return (
    <section>
      <SectionHead
        title="AI blog posts"
        subtitle="Written in full, ready to publish or export"
        right={`${posts.length} post${posts.length === 1 ? "" : "s"}`}
      />

      {posts.length > 0 ? (
        posts.map((post) => {
          const isReady =
            post.status === "GENERATED" ||
            post.status === "PUBLISHED" ||
            post.status === "ARCHIVED";
          const href = `/dashboard/${projectId}/content/${post.id}`;

          return (
            <div
              key={post.id}
              className="grid gap-3 border-b border-[#F3F5F8] px-0.5 py-4 sm:grid-cols-[minmax(0,1fr)_148px_112px] sm:items-center sm:gap-5"
            >
              <div className="min-w-0">
                {/*
                  Opened in a new tab so clicking a title is a "look at this"
                  action rather than a "leave the list" one — the value of a
                  finished post should be one click away, not a click-then-
                  click-back away.
                */}
                {isReady ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="group/title inline-flex items-center gap-1.5 text-[14px] font-medium text-[#0B1220] no-underline hover:no-underline"
                  >
                    <span className="truncate">{post.title}</span>
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-[#9AA2AE] transition-colors group-hover/title:text-[#0B1220]"
                      strokeWidth={1.9}
                    />
                  </a>
                ) : (
                  <div className="text-[14px] font-medium text-[#0B1220]">{post.title}</div>
                )}
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
                {isReady ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : post.status === "GENERATING" ? (
                  <Link href={href}>Watch progress</Link>
                ) : (
                  <span className="text-[#9AA2AE]">—</span>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <Empty className="mt-4 rounded-2xl border border-[#E2E6EC]">
          <EmptyTitle>No posts written yet</EmptyTitle>
          <EmptyDescription>
            {nextOpportunity
              ? "Your audit found opportunities worth writing about. Turn one into a post."
              : "Run an audit to surface the gaps worth writing about."}
          </EmptyDescription>
          {nextOpportunity ? (
            <Button
              size="sm"
              className="mt-3"
              disabled={isWriting || !canWrite}
              onClick={() => onWrite(nextOpportunity.id)}
              title={canWrite ? undefined : "You've used this month's posts."}
            >
              {isWriting ? "Writing…" : "Write a blog post"}
            </Button>
          ) : null}
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
