import { Button } from "@theseosaas/ui/components/button";
import { Empty, EmptyDescription, EmptyTitle } from "@theseosaas/ui/components/empty";
import { FadeIn } from "@theseosaas/ui/components/motion";
import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";
import { getAllPosts, getTopics, type BlogSummary } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Field notes — TheSEOSaaS",
  description:
    "What we learn running audits all day. No growth-hacking listicles — just the patterns we see across a few thousand crawls a month, and what we do about them.",
};

/**
 * /blog — the design's "Field Notes" index.
 *
 * Our own marketing writing, not the product's output. Posts are markdown
 * files under src/content/blog, so this page is fully static.
 *
 * There are no posts yet, and the empty state says exactly that rather than
 * pretending the section is broken. Everything around it — the header, the
 * free-audit card, the topic rail — is built and will simply fill in when the
 * first file lands.
 *
 * Responsive: the design is desktop-only. The topic rail moves below the posts
 * under `lg`, and the featured card loses its two-column split on phones.
 */
export default function BlogIndexPage() {
  const posts = getAllPosts();
  const topics = getTopics();

  const featured = posts.find((post) => post.featured) ?? posts[0] ?? null;
  const rest = featured ? posts.filter((post) => post.slug !== featured.slug) : posts;

  return (
    <>
      <MarketingHeader />

      <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-20 sm:px-8 lg:px-10 lg:pt-20">
        <FadeIn>
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
            Field notes
          </div>
          <h1 className="font-display mt-3.5 max-w-[18ch] text-[32px] font-semibold tracking-[-0.035em] text-pretty text-[#0B1220] sm:text-[44px]">
            What we learn running audits all day
          </h1>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.7] text-[#5B6472] sm:text-[16.5px]">
            No growth-hacking listicles. Just the patterns we see across a few thousand crawls a
            month, and what we do about them.
          </p>
        </FadeIn>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_268px] lg:gap-14">
          <div className="min-w-0">
            {featured ? (
              <>
                <FeaturedCard post={featured} />
                {rest.length > 0 ? (
                  <div className="mt-10 grid gap-x-8 gap-y-9 sm:grid-cols-2">
                    {rest.map((post) => (
                      <PostCard key={post.slug} post={post} />
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <Empty className="rounded-2xl border border-[#E2E6EC] py-16">
                <EmptyTitle>No field notes yet</EmptyTitle>
                <EmptyDescription>
                  We&apos;re writing the first few. In the meantime, the audit itself is the
                  fastest way to see what we&apos;d have written about your site.
                </EmptyDescription>
                <Button className="mt-5" render={<Link href="/" />}>
                  Run a free audit
                </Button>
              </Empty>
            )}
          </div>

          <aside className="min-w-0">
            <div className="rounded-2xl border border-[#E2E6EC] bg-[#FAFAFB] p-6">
              <div className="text-[15px] font-semibold tracking-[-0.01em] text-[#0B1220]">
                Audit your own site free
              </div>
              <p className="mt-2 text-[13px] leading-[1.6] text-[#5B6472]">
                Same crawl we run for customers. Shareable report, no account needed.
              </p>
              <Button size="sm" className="mt-4" render={<Link href="/" />}>
                Run a free audit
              </Button>
            </div>

            {topics.length > 0 ? (
              <div className="mt-8">
                <div className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480] uppercase">
                  Topics
                </div>
                <div className="mt-4 flex flex-col">
                  {topics.map((topic) => (
                    <div
                      key={topic.label}
                      className="flex items-baseline justify-between gap-3 border-b border-[#EDEFF3] py-2.5"
                    >
                      <span className="text-[13.5px] text-[#3F4854]">{topic.label}</span>
                      <span className="text-[11.5px] text-[#6B7480]">{topic.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </main>

      <MarketingFooter />
    </>
  );
}

function FeaturedCard({ post }: { post: BlogSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-2xl border border-[#E2E6EC] p-6 no-underline transition-colors hover:border-[#C6CDD8] sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#6B7480]">
        <span className="font-medium text-[#EA580C]">{post.category}</span>
        {post.date ? <span>{formatDate(post.date)}</span> : null}
        <span>· {post.readMinutes} min read</span>
      </div>

      <h2 className="font-display mt-3 max-w-[24ch] text-[24px] font-semibold tracking-[-0.028em] text-pretty text-[#0B1220] sm:text-[28px]">
        {post.title}
      </h2>

      {post.excerpt ? (
        <p className="mt-3 max-w-[68ch] text-[14.5px] leading-[1.7] text-[#5B6472]">
          {post.excerpt}
        </p>
      ) : null}

      <span className="mt-5 inline-block text-[13.5px] font-medium text-[#0B1220]">
        Read the breakdown →
      </span>
    </Link>
  );
}

function PostCard({ post }: { post: BlogSummary }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block min-w-0 no-underline">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#6B7480]">
        <span className="font-medium text-[#EA580C]">{post.category}</span>
        <span>{post.readMinutes} min read</span>
      </div>

      <h3 className="font-display mt-2.5 text-[18px] font-semibold tracking-[-0.02em] text-pretty text-[#0B1220]">
        {post.title}
      </h3>

      {post.excerpt ? (
        <p className="mt-2 text-[13.5px] leading-[1.65] text-[#5B6472]">{post.excerpt}</p>
      ) : null}

      {post.date ? (
        <div className="mt-3 text-[11.5px] text-[#6B7480]">{formatDate(post.date)}</div>
      ) : null}
    </Link>
  );
}

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;

  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
