import { Markdown } from "@theseosaas/ui/components/markdown";
import { FadeIn } from "@theseosaas/ui/components/motion";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/marketing/site-chrome";
import { getAllPosts, getPost } from "@/lib/blog";

/**
 * /blog/[slug] — one Field Notes article.
 *
 * Statically generated from the markdown files, and rendered with the same
 * hand-rolled renderer the product uses for generated posts, so our own
 * writing and our customers' output look identical. That's deliberate: the
 * blog is the shop window for the writing tool.
 */
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) return { title: "Not found — TheSEOSaaS" };

  return {
    title: `${post.title} — TheSEOSaaS`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: "article" },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) notFound();

  return (
    <>
      <MarketingHeader />

      <main className="flex justify-center px-5 pt-12 pb-20 sm:px-8 lg:pt-16">
        <FadeIn className="w-full max-w-[720px] min-w-0">
          <Link href="/blog" className="text-[13px] font-medium text-[#6B7480]">
            ← Field notes
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#6B7480]">
            <span className="font-medium text-[#EA580C]">{post.category}</span>
            {post.date ? <span>{formatDate(post.date)}</span> : null}
            <span>· {post.readMinutes} min read</span>
          </div>

          <h1 className="font-display mt-3 text-[28px] leading-[1.22] font-semibold tracking-[-0.03em] text-pretty text-[#0B1220] sm:text-[34px]">
            {post.title}
          </h1>

          {post.excerpt ? (
            <p className="mt-4 text-[15px] leading-[1.7] text-[#5B6472] italic">{post.excerpt}</p>
          ) : null}

          <div className="mt-7">
            <Markdown>{post.body}</Markdown>
          </div>

          <div className="mt-12 rounded-2xl border border-[#E2E6EC] bg-[#FAFAFB] p-6">
            <div className="text-[15px] font-semibold tracking-[-0.01em] text-[#0B1220]">
              Audit your own site free
            </div>
            <p className="mt-2 max-w-[52ch] text-[13.5px] leading-[1.6] text-[#5B6472]">
              Same crawl we run for customers. Shareable report, no account needed.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-[10px] bg-[#0B1220] px-5 py-2.5 text-[13.5px] font-medium text-white no-underline"
            >
              Run a free audit
            </Link>
          </div>
        </FadeIn>
      </main>

      <MarketingFooter />
    </>
  );
}

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;

  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
