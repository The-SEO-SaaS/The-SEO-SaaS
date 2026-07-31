import PDFDocument from "pdfkit";

import { toParagraphs } from "../util/prose.ts";
import { getAuditReport } from "./service.ts";

/**
 * The audit report as a PDF.
 *
 * Built directly rather than by rendering the web page in headless Chromium.
 * That alternative is pixel-perfect and costs a ~400MB Chromium install in the
 * Docker image plus a browser process per request — for a document that is
 * ultimately a heading, a score and four lists. Building it means exact control
 * over page breaks and a header and footer that genuinely repeat, which is the
 * part `@media print` cannot do reliably across browsers.
 *
 * Helvetica is used throughout: it's built into pdfkit and into every PDF
 * reader, so there are no font files to ship. Instrument Sans would match the
 * web report, but embedding a webfont for a document people mostly forward to a
 * colleague is not worth the bytes or the licence question.
 *
 * Node-only. `pdfkit` reads its metrics from the filesystem, so this must never
 * be pulled into a client bundle — see `serverExternalPackages` in
 * next.config.ts.
 */

const INK = "#0B1220";
const MUTED = "#5B6472";
const SUBTLE = "#6B7480";
const FAINT = "#9AA6B8";
const RULE = "#E2E6EC";
const GOOD = "#15803D";
const WARN = "#B45309";
const BAD = "#B91C1C";

/** A4 at 72dpi, with room for the repeating chrome. */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = { top: 74, bottom: 62, left: 56, right: 56 };
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

function severityColor(severity: string): string {
  if (severity === "CRITICAL") return BAD;
  if (severity === "WARNING") return WARN;
  return SUBTLE;
}

function scoreColor(score: number): string {
  if (score >= 75) return GOOD;
  if (score >= 50) return WARN;
  return BAD;
}

/**
 * Renders one audit to a PDF buffer.
 *
 * Buffered rather than streamed: the chrome is drawn in a second pass over
 * every page once the content is laid out, which needs the whole document in
 * memory anyway. These run to a handful of pages, so that's a few hundred KB.
 */
export async function renderAuditPdf(publicId: string): Promise<{
  buffer: Buffer;
  filename: string;
}> {
  const report = await getAuditReport(publicId);

  const doc = new PDFDocument({
    size: "A4",
    margins: MARGIN,
    // Required for the second pass — without it, `switchToPage` throws.
    bufferPages: true,
    info: {
      Title: `SEO audit — ${report.domain}`,
      Author: "TheSEOSaaS",
      Subject: `Search audit for ${report.domain}`,
      Creator: "TheSEOSaaS",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve) => doc.on("end", () => resolve()));

  // --- Cover block ---------------------------------------------------------

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(SUBTLE)
    .text("SEO AUDIT", { characterSpacing: 1.2 });

  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(26).fillColor(INK).text(report.domain);

  if (report.completedAt) {
    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(SUBTLE)
      .text(
        `Completed ${new Date(report.completedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })} · ${report.pagesCrawled} pages crawled`,
      );
  }

  doc.moveDown(1.2);

  // --- Score panel ---------------------------------------------------------

  const score = report.score ?? 0;
  const panelTop = doc.y;

  doc
    .roundedRect(MARGIN.left, panelTop, CONTENT_WIDTH, 76, 10)
    .fillAndStroke("#FAFBFC", RULE);

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(SUBTLE)
    .text("SEO SCORE", MARGIN.left + 20, panelTop + 16, { characterSpacing: 1 });

  doc
    .font("Helvetica-Bold")
    .fontSize(30)
    .fillColor(scoreColor(score))
    .text(`${score}`, MARGIN.left + 20, panelTop + 31, { continued: true })
    .font("Helvetica")
    .fontSize(13)
    .fillColor(FAINT)
    .text("/100");

  // Counts sit to the right of the number, on the same panel.
  const countsX = MARGIN.left + 150;
  const counts: Array<[string, number, string]> = [
    ["Critical", report.counts.critical, BAD],
    ["Warnings", report.counts.warning, WARN],
    ["Notices", report.counts.notice, SUBTLE],
  ];

  counts.forEach(([label, value, color], index) => {
    const x = countsX + index * 110;
    doc.font("Helvetica").fontSize(8.5).fillColor(SUBTLE).text(label, x, panelTop + 22);
    doc.font("Helvetica-Bold").fontSize(17).fillColor(color).text(String(value), x, panelTop + 37);
  });

  doc.y = panelTop + 76 + 22;
  doc.x = MARGIN.left;

  // --- Verdict -------------------------------------------------------------

  if (report.summary) {
    section(doc, "The verdict");

    // Same paragraph breaks as the report page and the email — see
    // util/prose.ts. A single 60-word block is a wall on screen and worse on
    // paper, where the reader can't scroll away from it.
    toParagraphs(report.summary).forEach((part, index) => {
      if (index > 0) doc.moveDown(0.55);
      doc
        .font("Helvetica")
        .fontSize(10.5)
        .fillColor(index === 0 ? INK : MUTED)
        .text(part, { width: CONTENT_WIDTH, lineGap: 3.5 });
    });

    doc.moveDown(1.2);
  }

  // --- Findings ------------------------------------------------------------

  if (report.issues.length) {
    section(doc, `What to fix (${report.issues.length})`);

    report.issues.forEach((issue, index) => {
      // Keep a finding's heading with at least its first lines of body. A
      // title stranded alone at the foot of a page is the single most common
      // way a generated PDF looks unfinished.
      ensureSpace(doc, 78);

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(severityColor(issue.severity))
        .text(issue.severity, { characterSpacing: 0.8, continued: true })
        .font("Helvetica")
        .fillColor(FAINT)
        .text(`   ${issue.category ?? ""}`);

      doc.moveDown(0.25);
      doc
        .font("Helvetica-Bold")
        .fontSize(11.5)
        .fillColor(INK)
        .text(`${index + 1}. ${issue.title}`, { width: CONTENT_WIDTH });

      if (issue.whyItMatters) {
        doc.moveDown(0.3);
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(MUTED)
          .text(issue.whyItMatters, { width: CONTENT_WIDTH, lineGap: 2.5 });
      }

      if (issue.howToFix) {
        doc.moveDown(0.35);
        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor(INK)
          .text("Fix: ", { continued: true })
          .font("Helvetica")
          .fillColor(MUTED)
          .text(issue.howToFix, { width: CONTENT_WIDTH, lineGap: 2.5 });
      }

      if (issue.affectedUrls?.length) {
        doc.moveDown(0.3);
        // Capped at five. A finding affecting forty URLs turns a readable
        // document into a link dump, and the web report has the full list.
        const shown = issue.affectedUrls.slice(0, 5);
        const extra = issue.affectedUrls.length - shown.length;
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(FAINT)
          .text(
            shown.join("\n") + (extra > 0 ? `\n+ ${extra} more` : ""),
            { width: CONTENT_WIDTH, lineGap: 1.5 },
          );
      }

      doc.moveDown(1);
    });
  }

  // --- Competitors ---------------------------------------------------------

  if (report.competitors.length) {
    ensureSpace(doc, 110);
    section(doc, "Who's ahead of you");

    for (const competitor of report.competitors) {
      ensureSpace(doc, 44);
      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .fillColor(INK)
        .text(competitor.name ?? competitor.domain, { width: CONTENT_WIDTH });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(SUBTLE)
        .text(competitor.domain, { width: CONTENT_WIDTH });

      if (competitor.bestPage) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(MUTED)
          .text(`Best page: ${competitor.bestPage.title}`, {
            width: CONTENT_WIDTH,
            lineGap: 2,
          });
      }
      doc.moveDown(0.7);
    }
    doc.moveDown(0.4);
  }

  // --- Keyword gaps --------------------------------------------------------

  if (report.keywordGaps.length) {
    ensureSpace(doc, 110);
    section(doc, "Keywords you don't cover");

    for (const keyword of report.keywordGaps) {
      ensureSpace(doc, 40);
      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .fillColor(INK)
        .text(keyword.term, { continued: true })
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(FAINT)
        .text(`   ${keyword.intent}`);

      if (keyword.rationale) {
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor(MUTED)
          .text(keyword.rationale, { width: CONTENT_WIDTH, lineGap: 2 });
      }
      doc.moveDown(0.6);
    }
    doc.moveDown(0.4);
  }

  // --- Opportunities -------------------------------------------------------

  if (report.opportunities.length) {
    ensureSpace(doc, 110);
    section(doc, "What to publish");

    report.opportunities.forEach((opportunity, index) => {
      ensureSpace(doc, 52);
      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .fillColor(INK)
        .text(`${index + 1}. ${opportunity.title}`, { width: CONTENT_WIDTH });

      if (opportunity.rationale) {
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor(MUTED)
          .text(opportunity.rationale, { width: CONTENT_WIDTH, lineGap: 2 });
      }

      if (opportunity.keywords?.length) {
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(FAINT)
          .text(opportunity.keywords.join(" · "), { width: CONTENT_WIDTH });
      }
      doc.moveDown(0.7);
    });
  }

  // --- Locked notice -------------------------------------------------------

  if (report.locked.isLocked && report.locked.issues > 0) {
    ensureSpace(doc, 60);
    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(SUBTLE)
      .text(
        `This is the free view. ${report.locked.issues} more findings, ${report.locked.keywords} more keyword gaps and ${report.locked.opportunities} more content ideas are in the full report.`,
        { width: CONTENT_WIDTH, lineGap: 2 },
      );
  }

  // --- Chrome, drawn last over every page ----------------------------------

  paintChrome(doc, report.domain);

  doc.end();
  await done;

  return {
    buffer: Buffer.concat(chunks),
    // Dots in a filename confuse some download handlers into truncating the
    // extension, so the domain's are flattened.
    filename: `seo-audit-${report.domain.replace(/[^a-z0-9]+/gi, "-")}.pdf`,
  };
}

/** A section heading with the rule beneath it, used five times above. */
function section(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 60);
  doc.x = MARGIN.left;
  doc.font("Helvetica-Bold").fontSize(13.5).fillColor(INK).text(title);
  doc.moveDown(0.35);

  const y = doc.y;
  doc
    .moveTo(MARGIN.left, y)
    .lineTo(MARGIN.left + CONTENT_WIDTH, y)
    .strokeColor(RULE)
    .lineWidth(1)
    .stroke();

  doc.y = y + 12;
  doc.x = MARGIN.left;
}

/**
 * Breaks the page when the next block wouldn't fit.
 *
 * pdfkit only breaks automatically mid-flow, which splits a heading from its
 * body and leaves an orphaned line at the top of the next page.
 */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > PAGE.height - MARGIN.bottom) {
    doc.addPage();
  }
}

/**
 * Header and footer on every page, in one pass at the end.
 *
 * Done here rather than on the `pageAdded` event because drawing during layout
 * moves the text cursor and shifts the content that triggered the new page.
 * With `bufferPages`, the page count is known and each one can be revisited
 * without disturbing anything.
 */
function paintChrome(doc: PDFKit.PDFDocument, domain: string): void {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);

    // Header: brand left, subject right, hairline under both.
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(INK)
      .text("TheSEOSaaS", MARGIN.left, 34, { lineBreak: false });

    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(FAINT)
      .text(`SEO audit · ${domain}`, MARGIN.left, 34, {
        width: CONTENT_WIDTH,
        align: "right",
        lineBreak: false,
      });

    doc
      .moveTo(MARGIN.left, 52)
      .lineTo(MARGIN.left + CONTENT_WIDTH, 52)
      .strokeColor(RULE)
      .lineWidth(0.75)
      .stroke();

    // Footer: rule, then origin left and page number right.
    const footerY = PAGE.height - 44;

    doc
      .moveTo(MARGIN.left, footerY - 12)
      .lineTo(MARGIN.left + CONTENT_WIDTH, footerY - 12)
      .strokeColor(RULE)
      .lineWidth(0.75)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(FAINT)
      .text("theseosaas.com", MARGIN.left, footerY, { lineBreak: false });

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(FAINT)
      .text(`${i - range.start + 1} of ${range.count}`, MARGIN.left, footerY, {
        width: CONTENT_WIDTH,
        align: "right",
        lineBreak: false,
      });
  }

  // Leave the cursor somewhere harmless — pdfkit writes trailing state on end().
  doc.flushPages();
}
