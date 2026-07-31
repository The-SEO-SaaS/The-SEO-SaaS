"use client";

import { cn } from "@theseosaas/ui/lib/utils";
import { Info } from "lucide-react";
import * as React from "react";

/**
 * A small markdown renderer, hand-rolled.
 *
 * No dependency on purpose. The generator is told to emit exactly one dialect —
 * headings, paragraphs, bullet and numbered lists, blockquotes, pipe tables,
 * rules, links, bold, italic and inline code — and the design specifies the
 * typography for precisely that set. A full CommonMark parser would be several
 * times the bundle for syntax we never produce, and would still need every one
 * of these styles written by hand.
 *
 * Deliberately not supported, because the prompt forbids them: raw HTML (it is
 * escaped by React, so a malicious body renders as visible text rather than
 * executing), images, footnotes and nested lists.
 *
 * Type sizes are the design's literal values from `/blog/[slug]`: 34px title,
 * 26px h2, 20px h3, 17px/1.75 body on #28303C.
 */

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbers"; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "code"; text: string }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "rule" };

export function Markdown({
  children,
  className,
  annotations,
}: {
  children: string;
  className?: string;
  /**
   * Optional per-heading explanations, keyed by the heading's own text
   * (trimmed, matched case-sensitively against what the model actually wrote).
   * When a heading's text has an entry, an info trigger renders beside it —
   * hover shows it, and it toggles open on click/tap so it works with no
   * hover state at all.
   *
   * Nothing here changes rendering for a heading with no matching entry, so
   * this is a no-op for every caller that doesn't pass it — the public
   * `/blog/[slug]` field notes render exactly as before.
   */
  annotations?: Record<string, React.ReactNode>;
}) {
  const blocks = React.useMemo(() => parse(children), [children]);

  return (
    <div className={cn("min-w-0", className)}>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} isFirst={index === 0} annotations={annotations} />
      ))}
    </div>
  );
}

// --- Parsing -----------------------------------------------------------------

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]!;

    if (line.trim() === "") {
      index++;
      continue;
    }

    // Fenced code. Consumed whole so nothing inside is treated as markdown.
    if (/^```/.test(line.trim())) {
      const body: string[] = [];
      index++;
      while (index < lines.length && !/^```/.test(lines[index]!.trim())) {
        body.push(lines[index]!);
        index++;
      }
      index++;
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ kind: "rule" });
      index++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const depth = heading[1]!.length;
      blocks.push({
        // h4+ would need its own size the design never specifies, so anything
        // deeper renders as an h3 rather than silently losing its hierarchy.
        kind: "heading",
        level: depth === 1 ? 1 : depth === 2 ? 2 : 3,
        text: heading[2]!.trim(),
      });
      index++;
      continue;
    }

    // A table needs its delimiter row on the next line, or it's just text
    // containing pipes.
    if (line.includes("|") && index + 1 < lines.length && isDelimiter(lines[index + 1]!)) {
      const header = splitRow(line);
      index += 2;

      const rows: string[][] = [];
      while (index < lines.length && lines[index]!.includes("|") && lines[index]!.trim() !== "") {
        rows.push(splitRow(lines[index]!));
        index++;
      }

      blocks.push({ kind: "table", header, rows });
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index]!)) {
        quoted.push(lines[index]!.replace(/^\s*>\s?/, ""));
        index++;
      }
      blocks.push({ kind: "quote", lines: quoted });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index]!)) {
        items.push(lines[index]!.replace(/^\s*[-*+]\s+/, "").trim());
        index++;
      }
      blocks.push({ kind: "bullets", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index]!)) {
        items.push(lines[index]!.replace(/^\s*\d+[.)]\s+/, "").trim());
        index++;
      }
      blocks.push({ kind: "numbers", items });
      continue;
    }

    // Paragraph: run on until a blank line or the start of another block.
    const paragraph: string[] = [];
    while (index < lines.length && lines[index]!.trim() !== "" && !startsBlock(lines[index]!)) {
      paragraph.push(lines[index]!.trim());
      index++;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function startsBlock(line: string): boolean {
  return (
    /^#{1,6}\s/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    /^```/.test(line.trim()) ||
    /^\s*(---|\*\*\*|___)\s*$/.test(line)
  );
}

function isDelimiter(line: string): boolean {
  return /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes("-");
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

// --- Inline ------------------------------------------------------------------

/**
 * Bold, italic, inline code and links, in one pass.
 *
 * Order matters: code is matched first so `**` inside a code span stays
 * literal, and links before emphasis so a bolded link label still resolves.
 */
const INLINE =
  /(`[^`]+`)|(\[[^\]]+\]\([^)\s]+\))|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)/g;

function inline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  INLINE.lastIndex = 0;

  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));

    const token = match[0];

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded-[4px] bg-[#F1F3F7] px-[5px] py-px font-mono text-[0.82em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)!;
      const href = link[2]!;
      // Anything not plainly http(s) or a fragment could be javascript: — the
      // body is model output, so it is not trusted to be a safe URL.
      const safe = /^(https?:\/\/|\/|#|mailto:)/i.test(href);

      nodes.push(
        safe ? (
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer nofollow">
            {link[1]}
          </a>
        ) : (
          <span key={key++}>{link[1]}</span>
        ),
      );
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));

  return nodes;
}

// --- Rendering ---------------------------------------------------------------

/**
 * The info trigger a heading's `annotations` entry renders as.
 *
 * Hover shows it, matching a conventional tooltip — but hover doesn't exist on
 * a phone, so it's also a toggle: tapping opens it and it stays open (rather
 * than vanishing the instant the finger lifts, which is what a hover-only
 * tooltip does under touch emulation), and it closes on an outside tap, a
 * second tap, or Escape. One component covers both interaction models rather
 * than shipping a separate mobile dialog for the same content.
 */
function HeadingHint({ content }: { content: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const closeIfOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="group/hint relative inline-flex shrink-0 self-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="What this section does"
        aria-expanded={open}
        className={cn(
          "inline-flex size-[19px] items-center justify-center rounded-full border text-[#6B7480] transition-colors",
          open
            ? "border-[#0B1220] bg-[#0B1220] text-white"
            : "border-[#DFE3EA] bg-white hover:border-[#0B1220] hover:text-[#0B1220]",
        )}
      >
        <Info className="size-[11px]" strokeWidth={2} />
      </button>

      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full left-1/2 z-30 mt-2 w-[min(280px,80vw)] -translate-x-1/2 rounded-lg border border-[#E2E6EC] bg-white px-3.5 py-3 text-left text-[12.5px] leading-[1.55] font-normal tracking-normal text-[#3F4854] opacity-0 shadow-[0_16px_32px_-14px_rgba(11,18,32,0.3)] transition-opacity duration-150",
          "group-hover/hint:pointer-events-auto group-hover/hint:opacity-100",
          open && "pointer-events-auto opacity-100",
        )}
      >
        {content}
      </span>
    </span>
  );
}

/** 17px/1.75 on #28303C — the design's body copy. */
const BODY = "text-[15.5px] leading-[1.75] text-[#28303C] sm:text-[17px]";

function BlockView({
  block,
  isFirst,
  annotations,
}: {
  block: Block;
  isFirst: boolean;
  annotations?: Record<string, React.ReactNode>;
}) {
  switch (block.kind) {
    case "heading": {
      const hint = annotations?.[block.text.trim()];

      if (block.level === 1) {
        return (
          <h1
            className={cn(
              "font-display flex items-baseline gap-2.5 text-[26px] leading-[1.22] font-semibold tracking-[-0.03em] text-pretty text-[#0B1220] sm:text-[34px]",
              !isFirst && "mt-10",
            )}
          >
            <span>{inline(block.text)}</span>
            {hint ? <HeadingHint content={hint} /> : null}
          </h1>
        );
      }

      if (block.level === 2) {
        return (
          <h2 className="font-display mt-[34px] flex items-baseline gap-2.5 text-[21px] font-semibold tracking-[-0.025em] text-[#0B1220] sm:text-[26px]">
            <span>{inline(block.text)}</span>
            {hint ? <HeadingHint content={hint} /> : null}
          </h2>
        );
      }

      return (
        <h3 className="font-display mt-[30px] flex items-baseline gap-2.5 text-[18px] font-semibold tracking-[-0.018em] text-[#0B1220] sm:text-[20px]">
          <span>{inline(block.text)}</span>
          {hint ? <HeadingHint content={hint} /> : null}
        </h3>
      );
    }

    case "paragraph":
      return <p className={cn(BODY, isFirst ? "" : "mt-[14px]")}>{inline(block.text)}</p>;

    case "bullets":
      return (
        <div className="mt-4 flex flex-col gap-[9px]">
          {block.items.map((item, index) => (
            <div key={index} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5">
              <span className={BODY} aria-hidden>
                •
              </span>
              <div className={BODY}>{inline(item)}</div>
            </div>
          ))}
        </div>
      );

    case "numbers":
      return (
        <div className="mt-[14px] flex flex-col gap-[9px]">
          {block.items.map((item, index) => (
            <div key={index} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2.5">
              <span className={BODY} aria-hidden>
                {index + 1}.
              </span>
              <div className={BODY}>{inline(item)}</div>
            </div>
          ))}
        </div>
      );

    case "quote":
      return (
        <blockquote className="my-[26px] border-l-[3px] border-[#DFE3EA] py-0.5 pl-5">
          {block.lines.map((line, index) => (
            <p
              key={index}
              className={cn(
                "text-[15.5px] leading-[1.75] text-[#5B6472] italic sm:text-[17px]",
                index > 0 && "mt-3",
              )}
            >
              {inline(line)}
            </p>
          ))}
        </blockquote>
      );

    case "code":
      return (
        <pre className="mt-[14px] overflow-x-auto rounded-lg border border-[#E2E6EC] bg-[#FAFAFB] p-4 font-mono text-[13px] leading-[1.6] text-[#28303C]">
          <code>{block.text}</code>
        </pre>
      );

    case "table":
      // Scrolls rather than wrapping: a squeezed data table is unreadable, and
      // the design's cells assume they get their width.
      return (
        <div className="mt-[14px] overflow-x-auto rounded-lg border border-[#E2E6EC]">
          <table className="w-full min-w-[440px] border-collapse">
            <thead>
              <tr className="bg-[#F7F8FA]">
                {block.header.map((cell, index) => (
                  <th
                    key={index}
                    className={cn(
                      "border-b border-[#E2E6EC] px-4 py-[11px] text-left text-[13px] font-semibold text-[#28303C]",
                      index > 0 && "border-l border-[#E2E6EC]",
                    )}
                  >
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={cn(
                        "px-4 py-[11px] text-[14px] text-[#28303C]",
                        rowIndex < block.rows.length - 1 && "border-b border-[#EDEFF3]",
                        index > 0 && "border-l border-[#EDEFF3]",
                      )}
                    >
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "rule":
      return <hr className="my-[34px] border-0 border-t border-[#E2E6EC]" />;
  }
}
