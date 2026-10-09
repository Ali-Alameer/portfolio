"use client";

import { useEffect, useRef } from "react";
import { buildScene, drawScene, glyph, kindColour, type Kind, type Scene } from "./viz/transformerScene";
import { rng, useCanvas, type Frame } from "./viz/useCanvas";
import styles from "./EmbeddingBackdrop.module.css";

/* A living "embedding space" behind the hero and contact bands, drawn like
   a t-SNE / UMAP plot of multimodal data. Three kinds of point stand for
   the three kinds of data: tiny squares (image patches), short wave
   segments (time series and audio) and small dashes (text tokens). Points
   drift; every so often most of them gather into a few mixed clusters, all
   three kinds together, as if a model were learning to fuse them, then the
   clusters dissolve and regroup somewhere else. Each point is joined to its
   nearest neighbours by faint lines, so the structure shifts as it moves.

   With `story`, the hero version adds the model in front of the field:
   input tokens, a small transformer, and processed tokens flowing out into
   the clusters (viz/transformerScene). Everything fades right down behind
   the headline, intro and citation panel so the text stays easy to read. */

type Pt = {
  kind: Kind;
  bx: number; // drift base, in 0..1 of the canvas
  by: number;
  ax: number; // drift amplitude and phase
  ay: number;
  ph: number;
  sp: number;
  rot: number; // fixed orientation for dashes and waves
  joins: boolean; // takes part in clustering
  lag: number; // personal delay, so clusters form gradually
  ox: number; // offset within its cluster
  oy: number;
};

const CYCLE = 26000; // ms: drift, gather, hold, dissolve
const NEIGHBOURS = 2;

// Where clusters may form on wide screens, as fractions of the band
// [x0, x1, y0, y1]: open space, away from text and panels.
type Area = [number, number, number, number];

export default function EmbeddingBackdrop({
  area = [0.55, 0.95, 0.2, 0.8],
  story = false,
}: {
  area?: Area;
  story?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ w: number; h: number; pts: Pt[]; scene: Scene | null } | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  // desktop pointers only: hovering near a token makes it the query
  useEffect(() => {
    if (!story) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    const onMove = (e: PointerEvent) => {
      const c = ref.current;
      if (!c) return;
      const r = c.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      pointer.current = inside ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [story]);

  useCanvas(ref, (f) => {
    // fewer points on small screens; roughly the old density elsewhere
    const st = state.current;
    if (!st || Math.abs(st.w - f.w) > 120 || Math.abs(st.h - f.h) > 120) {
      state.current = {
        w: f.w,
        h: f.h,
        pts: makePoints(f.w, f.h, story),
        scene: story ? buildScene(f.w, f.h) : null,
      };
    }
    const { pts, scene } = state.current!;
    const fade = story ? textFade(f.w, f.h) : () => 1;
    // on phones the story runs top to bottom, so clusters gather below it
    const where: Area = story && f.w < 832 ? [0.12, 0.88, 0.72, 0.94] : area;
    const outputs = draw(f, pts, where, fade);
    if (scene) drawScene(f.ctx, scene, f.t, f.p, fade, f.still ? null : pointer.current, outputs);
  });

  return (
    <div className={styles.backdrop} aria-hidden="true">
      <canvas ref={ref} className={styles.canvas} />
      <div className={styles.shade} />
    </div>
  );
}

function makePoints(w: number, h: number, story: boolean): Pt[] {
  const small = w < 700;
  // the story version carries more on screen already, so it uses fewer points
  const scale = story ? 0.7 : 1;
  const n = Math.round(
    scale * (small ? Math.min(42, Math.max(22, (w * h) / 9000)) : Math.min(96, Math.max(36, (w * h) / 14000))),
  );
  const rand = rng(17);
  return Array.from({ length: n }, (_, i) => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand());
    return {
      kind: (i % 3) as Kind,
      bx: rand(),
      by: rand(),
      ax: 0.02 + rand() * 0.05,
      ay: 0.02 + rand() * 0.05,
      ph: rand() * Math.PI * 2,
      sp: 0.6 + rand() * 0.8,
      rot: (rand() - 0.5) * 0.9,
      joins: rand() < 0.72,
      lag: rand() * 0.12,
      ox: Math.cos(a) * d,
      oy: Math.sin(a) * d,
    };
  });
}

// cluster centres for a given cycle: spread across the open area on wide
// screens; anywhere on small ones, where the shade covers the whole band
function centres(cycle: number, w: number, h: number, count: number, [x0, x1, y0, y1]: Area) {
  const rand = rng(1000 + cycle * 7);
  const wide = w >= 832 || y0 > 0.5;
  return Array.from({ length: count }, (_, i) => ({
    x: w * (wide ? x0 + (x1 - x0) * ((i + 0.2 + rand() * 0.6) / count) : 0.12 + 0.76 * rand()),
    y: h * (wide ? y0 + (y1 - y0) * rand() : 0.18 + 0.64 * rand()),
  }));
}

const smooth = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};

// Opacity multiplier for the hero story: very faint behind the headline and
// intro, softer behind the frosted citation panel, full in the open space.
function textFade(w: number, h: number) {
  if (w < 832) return () => 0.5;
  const zones: [number, number, number, number, number][] = [
    // x0, x1, y0, y1 (fractions), opacity inside
    [0.11, 0.54, 0.12, 0.9, 0.28], // eyebrow, intro, credentials, buttons
    [0.11, 0.68, 0.25, 0.5, 0.25], // the name and its box, which run further right
    [0.56, 0.88, 0.5, 0.97, 0.55],
  ];
  return (x: number, y: number) => {
    let f = 1;
    for (const [x0, x1, y0, y1, o] of zones) {
      const dx = Math.max(x0 * w - x, 0, x - x1 * w);
      const dy = Math.max(y0 * h - y, 0, y - y1 * h);
      const inside = 1 - smooth(Math.hypot(dx, dy) / 60);
      f = Math.min(f, 1 - (1 - o) * inside);
    }
    return f;
  };
}

function draw({ ctx, w, h, t, p }: Frame, pts: Pt[], area: Area, fade: (x: number, y: number) => number) {
  const cycle = Math.floor(t / CYCLE);
  const ph = (t % CYCLE) / CYCLE;
  // two or three clusters, as many as the open area has room for
  const k = Math.min(3, Math.max(2, Math.round(((area[1] - area[0]) * w) / 200)));
  const here = centres(cycle, w, h, k, area);
  // clusters fit the area they gather in
  const radius = Math.min(Math.min(w, h) * (w < 700 ? 0.16 : 0.1), (area[1] - area[0]) * w * 0.45);
  const pull = (lag: number) => {
    // drift 0–30%, gather 30–55%, hold 55–75%, dissolve 75–100%
    const u = ph - lag;
    return u < 0.3 ? 0 : u < 0.55 ? smooth((u - 0.3) / 0.25) : u < 0.75 ? 1 : 1 - smooth((u - 0.75) / 0.22);
  };

  const pos = pts.map((q, i) => {
    const s = t * 0.00006 * q.sp;
    const dx = (q.bx + q.ax * Math.sin(s + q.ph)) * w;
    const dy = (q.by + q.ay * Math.cos(s * 0.8 + q.ph)) * h;
    if (!q.joins) return { x: dx, y: dy };
    // mixed clusters: neighbouring indices (all three kinds) share a centre
    const c = here[Math.floor(i / 3) % k];
    const swirl = t * 0.00004;
    const cx = c.x + (q.ox * Math.cos(swirl) - q.oy * Math.sin(swirl)) * radius;
    const cy = c.y + (q.ox * Math.sin(swirl) + q.oy * Math.cos(swirl)) * radius * 0.8;
    const m = pull(q.lag);
    return { x: dx + (cx - dx) * m, y: dy + (cy - dy) * m };
  });

  // faint lines to each point's nearest neighbours
  const reach = Math.min(130, Math.max(80, w / 11));
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = p.ink;
  for (let i = 0; i < pos.length; i++) {
    const near: [number, number][] = [];
    for (let j = 0; j < pos.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
      if (d > reach) continue;
      near.push([d, j]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (const [d, j] of near.slice(0, NEIGHBOURS)) {
      ctx.globalAlpha = 0.16 * (1 - d / reach) * fade((pos[i].x + pos[j].x) / 2, (pos[i].y + pos[j].y) / 2);
      ctx.beginPath();
      ctx.moveTo(pos[i].x, pos[i].y);
      ctx.lineTo(pos[j].x, pos[j].y);
      ctx.stroke();
    }
  }

  // the points themselves
  pts.forEach((q, i) => {
    const { x, y } = pos[i];
    ctx.globalAlpha = (q.kind === 0 ? 0.75 : 0.6) * fade(x, y);
    glyph(ctx, q.kind, x, y, 1, q.rot, q.ph, kindColour(q.kind, p));
  });
  ctx.globalAlpha = 1;

  // where processed tokens from the model land: points currently clustering
  return pos.filter((_, i) => pts[i].joins);
}
