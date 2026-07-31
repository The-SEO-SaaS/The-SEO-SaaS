import { audit } from "@theseosaas/core";

/**
 * GET /api/audit/[publicId]/pdf — the report as a downloadable document.
 *
 * Not wrapped in `handler()` like the JSON routes: those serialise an envelope
 * and set `content-type: application/json`, which is exactly wrong here. A
 * failure returns plain text rather than a JSON body a browser would download
 * as a broken `.pdf`.
 *
 * Public, matching the report page itself. These links are meant to be shared,
 * and gating the PDF behind auth while the HTML is open would be theatre.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await context.params;

  try {
    const { buffer, filename } = await audit.renderAuditPdf(publicId);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/pdf",
        // `inline` rather than `attachment`: most people want to look at it
        // first, and every browser's PDF viewer offers a download button.
        "content-disposition": `inline; filename="${filename}"`,
        "content-length": String(buffer.byteLength),
        // A finished audit never changes, so it's worth caching hard. The
        // report page itself is what reflects a re-run.
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error(`[audit] PDF generation failed for ${publicId}:`, error);

    return new Response("We couldn't build that report as a PDF.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

/**
 * Node, explicitly. pdfkit reads its font metrics off the filesystem and uses
 * Node streams — neither exists on the edge runtime, and the failure there is a
 * build-time resolution error rather than anything obvious.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
