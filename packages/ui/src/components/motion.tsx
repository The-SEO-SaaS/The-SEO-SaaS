"use client";

import { cn } from "@theseosaas/ui/lib/utils";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import * as React from "react";

/**
 * Motion primitives.
 *
 * The design is static, so animation is added here rather than being implied by
 * it. Two rules keep it from becoming noise:
 *
 *  1. Motion is small and fast — 8px of travel, under 400ms. This is a tool
 *     founders use repeatedly, not a landing page they see once. Anything
 *     showy becomes irritating by the third visit.
 *  2. Everything respects prefers-reduced-motion. Users who ask for stillness
 *     get opacity only, never movement.
 *
 * Reach for these rather than hand-rolling variants at each call site, so
 * timing stays consistent across the app.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  fast: 0.2,
  base: 0.35,
  slow: 0.5,
} as const;

/** Hook form, for components that need the flag directly. */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

interface FadeInProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  /** Direction the element travels from. */
  from?: "bottom" | "top" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
  /** Animate when scrolled into view rather than on mount. */
  whenInView?: boolean;
}

const OFFSET = {
  bottom: { y: 8, x: 0 },
  top: { y: -8, x: 0 },
  left: { x: -8, y: 0 },
  right: { x: 8, y: 0 },
  none: { x: 0, y: 0 },
} as const;

export function FadeIn({
  from = "bottom",
  delay = 0,
  duration = DURATION.base,
  whenInView = false,
  className,
  children,
  ...props
}: FadeInProps) {
  const reduced = usePrefersReducedMotion();
  const offset = reduced ? OFFSET.none : OFFSET[from];

  const animation = {
    initial: { opacity: 0, ...offset },
    animate: { opacity: 1, x: 0, y: 0 },
    transition: { duration, delay, ease: EASE },
  };

  if (whenInView) {
    return (
      <motion.div
        className={className}
        initial={animation.initial}
        whileInView={animation.animate}
        // `once` matters: re-animating on every scroll pass is the fastest way
        // to make a long page feel restless.
        viewport={{ once: true, margin: "-60px" }}
        transition={animation.transition}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={animation.initial}
      animate={animation.animate}
      transition={animation.transition}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

/**
 * Reveals children in sequence. Use for lists and card grids — a set of cards
 * appearing together reads as a flash, in sequence it reads as arrival.
 */
export function Stagger({
  className,
  children,
  whenInView = true,
  ...props
}: Omit<HTMLMotionProps<"div">, "variants"> & { whenInView?: boolean }) {
  return (
    <motion.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      {...(whenInView
        ? { whileInView: "visible", viewport: { once: true, margin: "-60px" } }
        : { animate: "visible" })}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  className,
  children,
  ...props
}: Omit<HTMLMotionProps<"div">, "variants">) {
  const reduced = usePrefersReducedMotion();

  const variants: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 10 },
    visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
  };

  return (
    <motion.div className={className} variants={variants} {...props}>
      {children}
    </motion.div>
  );
}

/**
 * Subtle lift on hover for interactive cards.
 *
 * 2px and a shadow — enough to read as "this responds", not enough to shift
 * surrounding layout or distract while scanning.
 */
export function HoverLift({
  className,
  children,
  ...props
}: Omit<HTMLMotionProps<"div">, "whileHover">) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ duration: DURATION.fast, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Crossfades between phases — used by the audit screen moving from crawling to
 * gate to report. Without `mode="wait"` the outgoing and incoming phases
 * overlap and the page height jumps.
 */
export function PhaseTransition({
  phaseKey,
  className,
  children,
}: {
  phaseKey: string;
  className?: string;
  children: React.ReactNode;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phaseKey}
        className={className}
        initial={{ opacity: 0, y: reduced ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduced ? 0 : -6 }}
        transition={{ duration: DURATION.fast, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Counts up to a value. Used for the SEO score, which lands better as an
 * arrival than as a number that was simply always there.
 */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = React.useState(reduced ? value : 0);

  React.useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // Ease-out cubic: fast start, gentle settle.
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return <span className={cn("tabular-nums", className)}>{display}</span>;
}

export { AnimatePresence, motion };
