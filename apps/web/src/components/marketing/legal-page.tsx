import { BrandGlyph } from "@theseosaas/ui/components/brand-mark";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import Link from "next/link";

/**
 * Shared legal document layout.
 *
 * The design labels this screen "same template serves /privacy", so it's a
 * component rather than a one-off page: `/terms` and `/privacy` differ only by
 * their sections.
 *
 * Spec: its own slim header (30px mark, 17px wordmark, Terms/Privacy/Contact
 * links right, 20px/40px padding, 1px #EDEFF3 rule) — not the marketing header,
 * which carries product nav a legal page shouldn't. Body is a
 * `268px minmax(0,1fr)` grid at 56px gap with 44px/48px/60px padding: a
 * numbered table of contents left, prose capped at 74ch right, each section
 * opening with a 1px rule and a numbered heading.
 *
 * Below `lg` the ToC moves above the prose rather than being dropped — on a
 * long legal document it's the fastest way to the clause you came for.
 */
export interface LegalSection {
  /** Two-digit label, e.g. "01". Rendered beside the heading and in the ToC. */
  num: string;
  title: string;
  body: React.ReactNode;
}

export function LegalPage({
  eyebrow = "LEGAL",
  title,
  intro,
  sections,
  lastUpdated,
  activeLink,
}: {
  eyebrow?: string;
  title: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  lastUpdated: string;
  /** Which header link renders as current. */
  activeLink: "terms" | "privacy";
}) {
  const headerLinks = [
    { href: "/terms", label: "Terms", key: "terms" },
    { href: "/privacy", label: "Privacy", key: "privacy" },
    { href: "/contact", label: "Contact", key: "contact" },
  ] as const;

  return (
    <>
      <header className="border-b border-[#EDEFF3] bg-surface">
        <div className="flex items-center justify-between gap-6 px-5 py-4 sm:px-10 sm:py-5">
          <Link href="/" className="flex items-center gap-2.5 no-underline hover:no-underline">
            <IconTile tone="ink" size="md">
              <BrandGlyph />
            </IconTile>
            <span className="font-display text-ink-900 text-[17px] font-semibold tracking-[-0.03em]">
              TheSEOSaaS
            </span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-5">
            {headerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[13.5px] no-underline hover:no-underline",
                  link.key === activeLink
                    ? "text-ink-900 font-medium"
                    : "text-[#5B6472] hover:text-ink-900",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="grid items-start gap-8 px-5 py-10 sm:px-12 sm:pt-11 sm:pb-15 lg:grid-cols-[268px_minmax(0,1fr)] lg:gap-14">
        {/* On this page */}
        <FadeIn className="min-w-0 lg:sticky lg:top-8">
          <div className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480]">
            ON THIS PAGE
          </div>

          <nav className="mt-3.5 flex flex-col">
            {sections.map((section) => (
              <a
                key={section.num}
                href={`#section-${section.num}`}
                className="flex items-baseline gap-2.5 py-[7px] text-[13px] text-[#5B6472] no-underline hover:text-ink-900 hover:no-underline"
              >
                <span className="w-3.5 shrink-0 text-[11.5px] text-[#6B7480]">
                  {section.num}
                </span>
                <span>{section.title}</span>
              </a>
            ))}
          </nav>

          <p className="mt-5 border-t border-[#EDEFF3] pt-[18px] text-[12px] leading-[1.6] text-[#6B7480]">
            {lastUpdated}
          </p>
        </FadeIn>

        {/* Document */}
        <div className="min-w-0 max-w-[74ch]">
          <FadeIn delay={0.05}>
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
              {eyebrow}
            </div>
            <h1 className="font-display text-ink-900 mt-3 text-[26px] font-semibold tracking-[-0.032em] sm:text-[33px]">
              {title}
            </h1>
            <p className="mt-3 text-[15px] leading-[1.7] text-[#5B6472]">{intro}</p>
          </FadeIn>

          {sections.map((section) => (
            <section
              key={section.num}
              id={`section-${section.num}`}
              className="mt-8 border-t border-[#EDEFF3] pt-6 scroll-mt-8"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-[12px] text-[#6B7480]">{section.num}</span>
                <h2 className="text-ink-900 text-[18px] font-semibold tracking-[-0.015em]">
                  {section.title}
                </h2>
              </div>
              <div className="mt-2.5 text-[15px] leading-[1.75] text-[#28303C]">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
