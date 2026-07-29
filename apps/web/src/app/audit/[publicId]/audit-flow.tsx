"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { ProgressBar } from "@theseosaas/ui/components/progress-bar";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuditHeader, ReportMeta } from "@/components/audit/audit-header";
import { CrawlChecklist } from "@/components/audit/crawl-checklist";
import { EmailGate } from "@/components/audit/email-gate";
import {
  CompetitorsSection,
  FindingsSection,
  HealthySection,
  KeywordsSection,
  OpportunitiesSection,
  UnlockSection,
} from "@/components/audit/report-sections";
import { ScorePanel } from "@/components/audit/score-panel";
import { ScoreVerdict } from "@/components/audit/score-verdict";
import { useAuditFlow } from "@/hooks/use-audit";

/**
 * The three-phase audit screen: crawling → email gate → report.
 *
 * All three live at the same URL rather than separate routes, because the
 * transition is driven by job state the user doesn't control — routing between
 * them would put back-button states in the history that mean nothing.
 */
export function AuditFlow({ publicId }: { publicId: string }) {
  const router = useRouter();
  const { phase, progress, report, error, gaveUp, passGate } = useAuditFlow(publicId);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/audit/${publicId}` : undefined;

  if (phase === "failed" || gaveUp) {
    return (
      <>
        <AuditHeader />
        <main className="mx-auto max-w-lg px-6 py-24">
          <Card variant="panel" className="text-center">
            <CardContent className="space-y-4">
              <IconTile tone="critical" size="lg" className="mx-auto">
                <AlertTriangle />
              </IconTile>
              <h1 className="font-display text-ink-900 text-2xl font-semibold">
                We couldn&apos;t finish this audit
              </h1>
              <p className="why-line">
                {progress?.error ??
                  error ??
                  "The site may be blocking automated requests, or it took too long to respond."}
              </p>
              <Button render={<Link href="/" />}>Try another site</Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (phase === "running") {
    return (
      <>
        <AuditHeader />
        <main className="mx-auto max-w-lg px-6 py-20">
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="eyebrow text-ink-300">Crawl in progress</div>
              <h1 className="font-display text-ink-900 text-3xl font-semibold tracking-tight">
                Auditing your site
              </h1>
              <p className="why-line">
                This takes a couple of minutes. We&apos;re reading your pages, checking the
                technical basics, and working out who you&apos;re really competing with.
              </p>
            </div>

            <ProgressBar value={progress?.progress ?? 0} tone="ink" />

            <CrawlChecklist
              currentStep={progress?.currentStep ?? null}
              progress={progress?.progress ?? 0}
            />
          </div>
        </main>
      </>
    );
  }

  if (phase === "email-gate") {
    return (
      <>
        <AuditHeader />
        <main className="mx-auto max-w-lg px-6 py-24">
          <EmailGate publicId={publicId} onContinue={passGate} />
        </main>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <AuditHeader />
        <main className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-ink-300 text-center text-base">Loading your report…</div>
        </main>
      </>
    );
  }

  return (
    <>
      <AuditHeader shareUrl={shareUrl} />

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
        <ReportMeta
          domain={report.domain}
          completedAt={report.completedAt}
          pagesCrawled={report.pagesCrawled}
        />

        <Card variant="panel">
          <CardContent className="space-y-8">
            <ScorePanel
              score={report.score ?? 0}
              band={report.band}
              counts={report.counts}
            />

            <div className="border-line border-t pt-8">
              <ScoreVerdict
                score={report.score ?? 0}
                technicalHealth={report.technicalHealth}
                summary={report.summary}
              />
            </div>
          </CardContent>
        </Card>

        <FindingsSection issues={report.issues} />
        <HealthySection healthy={report.healthy} />

        <CompetitorsSection competitors={report.competitors} domain={report.domain} />
        <KeywordsSection keywords={report.keywordGaps} headline={report.keywordHeadline} />

        <OpportunitiesSection
          opportunities={report.opportunities}
          // Generation requires an account and a plan, so an anonymous viewer
          // is routed to pricing rather than shown a button that fails.
          onGenerate={report.isOwner ? undefined : () => router.push("/#pricing")}
        />

        {report.locked.isLocked ? (
          <UnlockSection
            domain={report.domain}
            locked={report.locked}
            onSeePlans={() => router.push("/#pricing")}
          />
        ) : null}

        <footer className="border-line text-ink-300 space-y-3 border-t pt-8 text-sm">
          <p>Report generated by TheSEOSaaS</p>
          <div className="flex gap-4">
            <Link href="/" className="text-ink-400 text-sm">
              Run your own audit
            </Link>
            <Link href="/terms" className="text-ink-400 text-sm">
              Terms
            </Link>
            <Link href="/privacy" className="text-ink-400 text-sm">
              Privacy
            </Link>
          </div>
        </footer>
      </main>
    </>
  );
}
