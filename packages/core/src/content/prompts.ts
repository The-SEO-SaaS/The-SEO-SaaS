import { SEO_LEAD_SYSTEM_PROMPT } from "../ai/prompts.ts";

/**
 * Content generation prompts.
 *
 * Two stages, deliberately separated. A brief is cheap, structured and free on
 * every plan, so the user can see the angle before spending quota; the post is
 * expensive prose written *from* that approved brief. Generating straight to
 * prose would mean paying for a full article to discover the angle was wrong.
 *
 * The house rule from SEO_LEAD_SYSTEM_PROMPT carries through both: every
 * output has to justify itself against a real finding, never generic advice.
 */

export interface BriefPromptInput {
  domain: string;
  /** What the site sells, extracted during the audit. */
  positioning: string | null;
  targetKeyword: string;
  supportingKeywords: string[];
  /** Why the audit surfaced this in the first place. */
  rationale: string;
  currentPosition: number | null;
  competitorsRanking: string[];
}

export function briefPrompt(input: BriefPromptInput): string {
  const position =
    input.currentPosition === null
      ? "The site does not currently rank for this term at all."
      : `The site currently ranks #${input.currentPosition} for this term.`;

  const rivals =
    input.competitorsRanking.length > 0
      ? `Competitors already ranking for it: ${input.competitorsRanking.join(", ")}.`
      : "No tracked competitor ranks for it yet.";

  return [
    `Write an outline for one article that ${input.domain} should publish.`,
    "",
    `What they sell: ${input.positioning ?? "Not established — infer it from the keyword."}`,
    `Target keyword: ${input.targetKeyword}`,
    input.supportingKeywords.length > 0
      ? `Supporting terms to work in naturally: ${input.supportingKeywords.join(", ")}`
      : "",
    `Why this was surfaced: ${input.rationale}`,
    position,
    rivals,
    "",
    "Rules:",
    "- The angle must be something this specific company can say and a generic",
    "  competitor cannot. If the angle would work for any company in the space,",
    "  it is the wrong angle.",
    "- Five to eight H2 sections. Each needs a one-line note on what it covers,",
    "  concrete enough that a writer could not pad it.",
    "- Do not invent statistics, prices, customer names or case studies. If a",
    "  section needs a number, say what number the writer must supply.",
    "- British or American spelling: match whatever the domain implies.",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface PostPromptInput {
  domain: string;
  positioning: string | null;
  title: string;
  angle: string;
  targetKeyword: string;
  supportingKeywords: string[];
  sections: { heading: string; covers: string }[];
  wordTarget: number;
}

export const POST_SYSTEM_PROMPT = `${SEO_LEAD_SYSTEM_PROMPT}

You are now writing the article itself. Output GitHub-flavoured markdown and nothing else — no preamble, no explanation of what you wrote, no code fence around the whole document.

Formatting you may use, and nothing beyond it, because the reader pastes this straight into their own site:
- "#" for the title, "##" for sections, "###" for sub-sections
- paragraphs, "-" bullet lists, "1." numbered lists
- "**bold**", "*italic*", "\`inline code\`"
- "> " blockquotes
- pipe tables with a header row
- "---" horizontal rules
- [links](https://example.com)

Never use HTML, images, footnotes or nested lists.`;

export function postPrompt(input: PostPromptInput): string {
  const outline = input.sections
    .map((section, index) => `${index + 1}. ## ${section.heading} — ${section.covers}`)
    .join("\n");

  return [
    `Write the full article for ${input.domain}.`,
    "",
    `What they sell: ${input.positioning ?? "Infer it from the outline."}`,
    `Title: ${input.title}`,
    `Angle: ${input.angle}`,
    `Target keyword: ${input.targetKeyword}`,
    input.supportingKeywords.length > 0
      ? `Work these in where they fit naturally: ${input.supportingKeywords.join(", ")}`
      : "",
    "",
    "Outline to follow, in order:",
    outline,
    "",
    `Length: about ${input.wordTarget} words.`,
    "",
    "Rules:",
    "- Open with the reader's problem, not a definition of the keyword. Never",
    "  begin with 'In today's world' or 'When it comes to'.",
    "- Use the target keyword in the title and naturally in the body. Do not",
    "  repeat it mechanically — write for the reader, not the crawler.",
    "- Include at least one table or one numbered procedure where the content",
    "  genuinely calls for it. Do not force either.",
    "- Never invent statistics, prices, dates, studies, customer names or",
    "  quotes. Where a specific figure would strengthen a claim, write the",
    "  sentence so the user can drop their own number in.",
    "- End on what the reader should do next, tied to what this company offers.",
    "  One mention, not a sales pitch.",
  ]
    .filter(Boolean)
    .join("\n");
}
