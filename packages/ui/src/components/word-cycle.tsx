"use client";

import { cn } from "@theseosaas/ui/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as React from "react";

/**
 * Cycles a search engine in place, on a light-switch flip.
 *
 * The mechanic is a panel turning on a horizontal axle: the outgoing name tips
 * forward until it's edge-on and gone, then the incoming one swings down from
 * above into the same plane. Each engine brings its own mark and its own brand
 * colour, so the flip carries a colour change too — that's most of what sells it
 * as a physical object rather than two words swapping.
 *
 * Four details that decide whether this reads as smooth or as a glitch:
 *
 *  1. **Rotation only, no travel.** An earlier version translated the faces
 *     ±55% as well as rotating them, which left two half-opaque copies of
 *     different words overlapping mid-flip — the "unnatural" look. Pure
 *     `rotateX` about the centre means a face is always either flat-on or
 *     edge-on, and edge-on is invisible without needing a clip mask (which
 *     would slice the descenders in "Google" anyway).
 *  2. **The two halves are sequenced, not simultaneous.** The incoming face is
 *     delayed until the outgoing one is nearly edge-on. Overlapping them fully
 *     is what makes a flip look like a crossfade.
 *  3. **Width.** "Bing" and "DuckDuckGo" differ by ~120px at hero size. The box
 *     is measured per engine and animated, timed to move while both faces are
 *     edge-on so the change happens where nothing is legible.
 *  4. **Fonts load late.** Instrument Sans arrives after first paint and a width
 *     measured against the fallback is wrong by a visible margin, so
 *     `document.fonts.ready` triggers a re-measure.
 *
 * Reduced motion gets a crossfade and an instant width change.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** How long the outgoing face takes to reach edge-on, in seconds. */
const OUT = 0.32;
/** When the incoming face starts, in seconds. Just before the outgoing vanishes. */
const IN_DELAY = 0.24;
const IN = 0.46;

export interface CycleSegment {
  text: string;
  color: string;
}

export interface CycleWord {
  /** The whole word. Used for width measurement and for assistive tech. */
  label: string;
  /** Single colour for the whole label. Ignored when `segments` is set. */
  color?: string;
  /**
   * Per-run colouring, for wordmarks that aren't one colour — Google's, in
   * practice. Concatenating `text` must reproduce `label` exactly, or the
   * measured width won't match what's painted.
   */
  segments?: readonly CycleSegment[];
  /** Public path to the engine's mark, e.g. `/search-engines/google.png`. */
  icon?: string;
}

export interface WordCycleProps {
  /** Cycled in order, looping. A single entry renders statically. */
  words: readonly CycleWord[];
  /** Milliseconds each entry is held before the next flip. */
  interval?: number;
  /**
   * Trailing punctuation, tinted to match the current engine.
   *
   * Rendered outside the rotating box rather than inside it. A full stop that
   * flips along with the word draws the eye to the punctuation, of all things;
   * held still and re-coloured, it reads as part of the same object without
   * competing. It's also excluded from the width measurement, so it simply
   * follows the box rather than being animated itself.
   */
  suffix?: string;
  className?: string;
}

/** The colour a suffix takes: the last run, so a multi-colour word continues. */
function trailingColor(word: CycleWord): string {
  if (word.segments?.length) return word.segments[word.segments.length - 1]!.color;
  return word.color ?? "currentColor";
}

export function WordCycle({ words, interval = 3000, suffix, className }: WordCycleProps) {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = React.useState(0);

  // One hidden span per label, laid out in the real font at the real size, so
  // the measurement is the rendered width rather than an estimate.
  const sizerRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const [widths, setWidths] = React.useState<number[]>([]);

  const measure = React.useCallback(() => {
    const next = sizerRefs.current.map((node) => node?.getBoundingClientRect().width ?? 0);
    setWidths((current) =>
      current.length === next.length && current.every((value, i) => value === next[i])
        ? current
        : next,
    );
  }, []);

  // `useEffect`, not `useLayoutEffect`: this is prerendered on the server, where
  // a layout effect only logs a warning. The box starts at `auto`, so there is
  // nothing to correct before first paint.
  React.useEffect(() => {
    measure();

    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  React.useEffect(() => {
    if (words.length < 2) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [words.length, interval]);

  const current = words[index];
  const width = widths[index];

  if (!current) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-[0.3em] align-baseline", className)}
      style={{ perspective: 800 }}
    >
      {/*
        The mark sits in a fixed-size box so a wider or narrower logo can't feed
        back into the width animation — only the label moves the layout.
      */}
      {current.icon ? (
        <span className="relative inline-block size-[0.82em] shrink-0 translate-y-[0.02em]">
          <AnimatePresence initial={false}>
            <motion.img
              key={current.icon}
              src={current.icon}
              alt=""
              aria-hidden
              className="absolute inset-0 size-full object-contain"
              initial={{ opacity: 0, scale: reduced ? 1 : 0.75 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: {
                  duration: reduced ? 0.2 : IN,
                  delay: reduced ? 0 : IN_DELAY,
                  ease: EASE,
                },
              }}
              exit={{
                opacity: 0,
                scale: reduced ? 1 : 0.75,
                transition: { duration: reduced ? 0.2 : OUT, ease: EASE },
              }}
            />
          </AnimatePresence>
        </span>
      ) : null}

      <motion.span
        className="relative inline-grid align-baseline"
        style={{ transformStyle: "preserve-3d" }}
        animate={width ? { width } : undefined}
        transition={{
          duration: reduced ? 0 : OUT + IN_DELAY,
          // Held until both faces are edge-on, so the sentence re-flows where
          // there is nothing legible to watch shift.
          delay: reduced ? 0 : OUT * 0.5,
          ease: EASE,
        }}
      >
        {/* Sizers. Out of flow, never painted, never read aloud. */}
        <span aria-hidden className="pointer-events-none invisible absolute whitespace-nowrap">
          {words.map((candidate, i) => (
            <span
              key={candidate.label}
              ref={(node) => {
                sizerRefs.current[i] = node;
              }}
              className="absolute whitespace-nowrap"
            >
              {candidate.label}
            </span>
          ))}
        </span>

        {/*
          A live region would announce every tick, which is noise — the sentence
          means the same thing whichever engine is up. The full list is exposed
          once, statically, to assistive tech.
        */}
        <span className="sr-only">{words.map((word) => word.label).join(", ")}</span>

        <span aria-hidden className="col-start-1 row-start-1 grid">
          <AnimatePresence initial={false}>
            <motion.span
              key={current.label}
              className="col-start-1 row-start-1 whitespace-nowrap"
              style={{
                color: current.color,
                transformOrigin: "50% 50%",
                backfaceVisibility: "hidden",
              }}
              initial={reduced ? { opacity: 0 } : { opacity: 0, rotateX: -90 }}
              animate={
                reduced
                  ? { opacity: 1, transition: { duration: 0.2 } }
                  : {
                      opacity: 1,
                      rotateX: 0,
                      transition: { duration: IN, delay: IN_DELAY, ease: EASE },
                    }
              }
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: 0.2 } }
                  : {
                      opacity: 0,
                      rotateX: 90,
                      transition: { duration: OUT, ease: EASE },
                    }
              }
            >
              {current.segments?.length
                ? current.segments.map((segment, i) => (
                    <span key={`${segment.text}-${i}`} style={{ color: segment.color }}>
                      {segment.text}
                    </span>
                  ))
                : current.label}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.span>

      {suffix ? (
        <motion.span
          aria-hidden
          // `-ml-[0.3em]` cancels the flex gap: punctuation should sit tight
          // against the word, not a third of an em away from it.
          className="-ml-[0.3em] shrink-0"
          initial={false}
          animate={{ color: trailingColor(current) }}
          transition={{
            duration: reduced ? 0 : IN,
            delay: reduced ? 0 : IN_DELAY,
            ease: EASE,
          }}
        >
          {suffix}
        </motion.span>
      ) : null}
    </span>
  );
}
