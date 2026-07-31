/**
 * Splits a verdict into readable paragraphs.
 *
 * The model returns the audit summary as one block. At 60-odd words that's a
 * wall — the reader's eye has no landing point, and the one paragraph they'd
 * actually act on ("start by creating…") is buried in the middle of it.
 *
 * The prompt now asks for blank-line breaks, so new audits arrive already
 * split. This function handles that *and* every audit written before the
 * prompt changed, which is why it can't just be `text.split("\n\n")`.
 *
 * The fallback groups sentences in pairs. Two is deliberate: one sentence per
 * paragraph reads as a bulleted list with the bullets removed, and three puts
 * us back where we started on anything over 50 words.
 *
 * Shared by the report page, the email and the PDF so all three break in the
 * same places — a reader who gets the email and then opens the report should
 * see the same document.
 */

/** Below this, splitting makes it look fragmented rather than airy. */
const MIN_LENGTH_TO_SPLIT = 240;
const SENTENCES_PER_PARAGRAPH = 2;

export function toParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];

  const trimmed = text.trim();
  if (!trimmed) return [];

  // Already broken up by the model — trust it and just tidy.
  const explicit = trimmed
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (explicit.length > 1) return explicit;

  if (trimmed.length < MIN_LENGTH_TO_SPLIT) return [trimmed];

  /**
   * Sentence split on terminal punctuation followed by whitespace and a capital.
   *
   * `split`, not `match`. A `match` with the same intent silently discards
   * anything between matches, and on this copy it did exactly that: the
   * sentence "Competitors such as apps.microsoft.com and copyq.net dominate
   * these queries…" disappeared from the output entirely, because the engine
   * couldn't find a match starting at it and just moved on. A split can only
   * ever redistribute text, never lose it.
   *
   * The lookbehind/lookahead pair is what keeps domains intact — after the dot
   * in "copyq.net" comes a lowercase letter, so it isn't a break. Domains
   * appear in nearly every verdict, so a naive split on `.` would shred them.
   */
  const sentences = trimmed
    .split(/(?<=[.!?])\s+(?=["'“(]?[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length < 3) return [trimmed];

  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) {
    paragraphs.push(
      sentences
        .slice(i, i + SENTENCES_PER_PARAGRAPH)
        .join(" ")
        .trim(),
    );
  }

  // A trailing one-sentence paragraph looks like an afterthought; fold it back.
  if (paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1]!;
    if (last.length < 80) {
      paragraphs[paragraphs.length - 2] += ` ${last}`;
      paragraphs.pop();
    }
  }

  return paragraphs;
}
