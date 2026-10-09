// Plain helpers shared by the canvases and by server-rendered SVG figures
// (no "use client", so server components can call them too).

/** Smooth 0→1 ease used for draw-in progress. */
export const ease = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return 1 - Math.pow(1 - c, 3);
};

/** Small deterministic PRNG so layouts are stable between renders. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
