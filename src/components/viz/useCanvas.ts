"use client";

import { useEffect, useRef, type RefObject } from "react";

export { ease, rng } from "./math";

// Shared plumbing for the small instrument-style canvases in the middle of
// the page: sizes the canvas for the device pixel ratio, reads the site's
// colour tokens (and re-reads them when the theme changes), runs only while
// the canvas is on screen and the tab is visible, and under reduced motion
// draws one still frame instead of animating.

export type Palette = {
  box: string;
  live: string;
  ink: string;
  muted: string;
  line: string;
};

export type Frame = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** ms since the canvas first came into view; fixed under reduced motion */
  t: number;
  p: Palette;
  still: boolean;
};

// the moment a still frame shows: late enough for draw-in effects to finish
const STILL_T = 6000;

export function useCanvas(
  ref: RefObject<HTMLCanvasElement | null>,
  draw: (f: Frame) => void,
  /** moment shown as the still frame under reduced motion */
  stillT = STILL_T,
) {
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let p = readPalette(canvas);
    let raf = 0;
    let onScreen = false;
    let started = 0; // performance.now() when first shown
    let paused = 0; // total ms spent off screen, so motion resumes where it left off
    let pausedAt = 0;

    const frame = (now: number) => {
      const t = still ? stillT : now - started - paused;
      ctx.clearRect(0, 0, w, h);
      drawRef.current({ ctx, w, h, t, p, still });
      if (!still && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      const now = performance.now();
      if (!started) started = now;
      if (pausedAt) {
        paused += now - pausedAt;
        pausedAt = 0;
      }
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      if (!pausedAt) pausedAt = performance.now();
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (still || !onScreen) frame(performance.now());
    };

    const retheme = () => {
      p = readPalette(canvas);
      if (still || !onScreen) frame(performance.now());
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (still) return;
      if (onScreen && !document.hidden) start();
      else stop();
    });
    io.observe(canvas);

    const onVisibility = () => {
      if (still) return;
      if (document.hidden || !onScreen) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ThemeToggle fires "themechange"; the OS scheme can change too
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    window.addEventListener("themechange", retheme);
    scheme.addEventListener("change", retheme);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("themechange", retheme);
      scheme.removeEventListener("change", retheme);
    };
  }, [ref, stillT]);
}

function readPalette(el: Element): Palette {
  const css = getComputedStyle(el);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    box: v("--box", "#3a3edc"),
    live: v("--live", "#1d7a4b"),
    ink: v("--ink", "#121815"),
    muted: v("--muted", "#58625c"),
    line: v("--line", "#d3d9d3"),
  };
}
