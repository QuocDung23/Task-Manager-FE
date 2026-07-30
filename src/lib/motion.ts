import type { Transition, MotionProps } from "framer-motion";

/**
 * Shared motion design tokens for dialogs and animated UI across the app.
 *
 * These tokens intentionally stay tiny: they capture the *only* two motion
 * idioms used by the dialog system today (fluid cubic-bezier for content
 * entrance + a snappy spring for button press feedback).
 *
 * If a component needs a different feel, prefer composing these tokens
 * locally rather than introducing a new global constant.
 */

/**
 * `EASE_FLUID` — a smooth, accelerating-then-decelerating curve used for
 * content entrance animations (dialog body, form).
 *
 * Control points `[0.32, 0.72, 0, 1]` approximate a custom "Apple-like"
 * ease: it leaves the source slowly, accelerates through the middle, and
 * settles without overshoot. Pairs with `duration` between 0.4s–0.6s.
 */
export const EASE_FLUID = [0.32, 0.72, 0, 1] as const;

/**
 * `SPRING_PRESS` — a stiff-but-soft spring used for `whileHover` /
 * `whileTap` feedback on buttons (scale 1.02 hover, 0.98 tap).
 *
 * Tuning:
 *   - `stiffness: 420` — snappy response, returns to rest quickly.
 *   - `damping: 28`    — critical-ish damping; minimal bounce.
 *
 * Higher stiffness than a typical "playful" spring so dialog actions feel
 * decisive rather than bouncy.
 */
export const SPRING_PRESS: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 28,
};

/**
 * `enterTransition` — factory for the standard dialog-body entrance.
 *
 * Returns the proper framer-motion `transition` value based on the user's
 * `prefers-reduced-motion` setting:
 *
 *   - Reduced motion ON  → `{ duration: 0 }` (instant snap, no animation).
 *   - Reduced motion OFF → `{ duration: 0.55, ease: EASE_FLUID }`.
 *
 * Usage:
 * ```tsx
 * const reduceMotion = useReducedMotion();
 * const enterTransition = enterTransitionFor(reduceMotion);
 *
 * <motion.div
 *   initial={reduceMotion ? false : { opacity: 0, y: 10 }}
 *   animate={{ opacity: 1, y: 0 }}
 *   transition={enterTransition}
 * />
 * ```
 *
 * We expose this as a *factory* (not a constant) because the value depends
 * on runtime user preference — computing it once at module scope would
 * freeze the result and defeat the purpose.
 */
export const enterTransitionFor = (reduceMotion: boolean | null): Transition =>
  reduceMotion
    ? { duration: 0 }
    : { duration: 0.55, ease: EASE_FLUID };

/**
 * `pressHover` / `pressTap` — preset `whileHover` / `whileTap` props for
 * buttons. Return `undefined` when reduced motion is on so framer-motion
 * skips the gesture entirely.
 *
 * Usage:
 * ```tsx
 * <motion.button
 *   whileHover={pressHover(reduceMotion)}
 *   whileTap={pressTap(reduceMotion)}
 *   transition={SPRING_PRESS}
 * />
 * ```
 */
export const pressHover = (reduceMotion: boolean | null): MotionProps["whileHover"] =>
  reduceMotion ? undefined : { scale: 1.02 };

export const pressTap = (reduceMotion: boolean | null): MotionProps["whileTap"] =>
  reduceMotion ? undefined : { scale: 0.98 };

/**
 * `pressHoverStrong` / `pressTapStrong` — bolder variant (1.03 / 0.97)
 * used for the primary dialog trigger button (e.g. "New project"). Gives
 * the trigger button a slightly more present feel than the in-dialog
 * action buttons.
 */
export const pressHoverStrong = (
  reduceMotion: boolean | null,
): MotionProps["whileHover"] => (reduceMotion ? undefined : { scale: 1.03 });

export const pressTapStrong = (
  reduceMotion: boolean | null,
): MotionProps["whileTap"] => (reduceMotion ? undefined : { scale: 0.97 });

/**
 * `iconHover` / `iconTap` — preset for the small icon-only `motion.button`
 * (e.g. dialog close X). Slightly larger scale than press variants
 * because the icon is tiny and needs more obvious feedback.
 */
export const iconHover = (reduceMotion: boolean | null): MotionProps["whileHover"] =>
  reduceMotion ? undefined : { scale: 1.05 };

export const iconTap = (reduceMotion: boolean | null): MotionProps["whileTap"] =>
  reduceMotion ? undefined : { scale: 0.95 };