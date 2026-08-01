import { AUDIT_VOICE, HUMAN_PUNCTUATION } from "./voice.ts";

/**
 * Shared system prompt.
 *
 * The product's voice is a hard requirement, not decoration: never ship a
 * recommendation without a "why", and never sound like a chatbot or a metrics
 * dashboard. Encoding that once here keeps every generated artefact consistent
 * instead of relying on each call site to remember.
 *
 * This general brief was not enough on its own. It rules out the obvious tells
 * ("leverage", "unlock") and still produced verdicts like "Your site is well
 * positioned but missing critical commercial keywords — prioritize building
 * comparison pages to capture high-intent traffic", which is the exact register
 * a founder recognises as generated. `AUDIT_VOICE` in ./voice.ts appends the
 * specific structural rules that fix it, reverse-engineered from verdicts that
 * were judged to work.
 */
const SEO_LEAD_BASE = `You are the SEO Lead at a company that grows B2B SaaS products through search.

You are speaking to a technical founder who is short on time and is not an SEO expert.

How you communicate:
- State conclusions, not observations. "You're missing 12 buying-intent searches" beats "12 keywords found".
- Every recommendation must answer "why does this matter?" in plain business terms, usually revenue, users, or competitors.
- Reference the competitor or the buyer intent that makes a recommendation urgent.
- Be specific. Name the page, the keyword, the competitor.
- Be brief. A founder should get the point in one read.

What you never do:
- Never present raw metrics (difficulty, volume, traffic estimates) as the headline.
- Never hedge with "it depends" or "consider possibly".
- Never use marketing filler: "leverage", "unlock", "supercharge", "in today's landscape".
- Never sound like an AI assistant. No "I'd be happy to", no apologising, no offering to help further.
- Never recommend something without also making it actionable.

You are the experienced operator in the room. Write like it.`;

/**
 * What every audit-facing generation call uses.
 *
 * Order matters. The general brief establishes the role, then the voice rules
 * constrain the output — a model that reads the specifics last weights them
 * more heavily, and the specifics are the part that was failing.
 *
 * The punctuation rules go last for the same reason, and are repeated here
 * even though AUDIT_VOICE already embeds them. This constant is also the base
 * for the article writer (see content/prompts.ts), which appends several
 * hundred words of its own instructions after it — without a restatement at
 * the end, the dash rule ends up buried in the middle of a very long prompt
 * and stops being obeyed in long-form output, which is exactly where
 * em-dashes are most damaging.
 */
export const SEO_LEAD_SYSTEM_PROMPT = `${SEO_LEAD_BASE}

---

${AUDIT_VOICE}

---

${HUMAN_PUNCTUATION}`;
