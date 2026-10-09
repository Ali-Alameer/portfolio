"use client";

import { useMemo, useRef } from "react";
import { ease, rng, useCanvas, type Frame } from "./useCanvas";
import styles from "./viz.module.css";

type Node = { x: number; y: number; r: number; hub: number; delay: number; drift: number };

// A faint citation graph: one hub per selected paper, sized by its
// citations, with citing works linked to it. Links draw themselves in when
// the section first comes into view, then the graph breathes slowly and the
// odd new citation travels along a link.
export default function CitationNetwork({ weights }: { weights: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const layout = useMemo(() => build(weights), [weights]);
  useCanvas(ref, (f) => draw(f, layout));
  return <canvas ref={ref} className={`${styles.canvas} ${styles.figure}`} aria-hidden="true" />;
}

function build(weights: number[]) {
  const rand = rng(11);
  const max = Math.max(...weights);
  // hubs placed on a loose arc, in unit coordinates
  const hubs: Node[] = weights.map((c, i) => ({
    x: 0.3 + 0.6 * (i / Math.max(1, weights.length - 1)) + (rand() - 0.5) * 0.08,
    y: 0.25 + 0.5 * rand(),
    r: 2.5 + 4.5 * Math.sqrt(c / max),
    hub: -1,
    delay: i * 140,
    drift: rand() * 6,
  }));
  // citing works: more around the most-cited hubs
  const sats: Node[] = [];
  weights.forEach((c, i) => {
    const n = 3 + Math.round(9 * Math.sqrt(c / max));
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const d = 0.08 + rand() * 0.16;
      sats.push({
        x: hubs[i].x + Math.cos(a) * d,
        y: hubs[i].y + Math.sin(a) * d * 1.4,
        r: 1.2,
        hub: i,
        delay: 500 + rand() * 1400,
        drift: rand() * 6,
      });
    }
  });
  // a few links between hubs (papers citing each other)
  const cross: [number, number][] = [];
  for (let i = 0; i < hubs.length; i++)
    for (let j = i + 1; j < hubs.length; j++) if (rand() < 0.35) cross.push([i, j]);
  return { hubs, sats, cross };
}

function draw({ ctx, w, h, t, p }: Frame, { hubs, sats, cross }: ReturnType<typeof build>) {
  const sway = (n: Node) => ({
    x: (n.x + 0.006 * Math.sin(t * 0.0004 + n.drift)) * w,
    y: (n.y + 0.008 * Math.cos(t * 0.00035 + n.drift)) * h,
  });
  const H = hubs.map(sway);

  ctx.lineWidth = 0.75;
  ctx.strokeStyle = p.muted;
  for (const [i, j] of cross) {
    const k = ease((t - 1400 - i * 120) / 900);
    if (k <= 0) continue;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(H[i].x, H[i].y);
    ctx.lineTo(H[i].x + (H[j].x - H[i].x) * k, H[i].y + (H[j].y - H[i].y) * k);
    ctx.stroke();
  }

  sats.forEach((s, idx) => {
    const k = ease((t - s.delay) / 900);
    if (k <= 0) return;
    const a = sway(s);
    const b = H[s.hub];
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = p.muted;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * k;
    ctx.fillStyle = p.muted;
    ctx.beginPath();
    ctx.arc(a.x, a.y, s.r, 0, Math.PI * 2);
    ctx.fill();

    // an occasional citation travelling in along this link
    const period = 9000 + (idx % 7) * 1300;
    const u = ((t + idx * 977) % period) / 1400;
    if (t > 2600 && u < 1) {
      const e = ease(u);
      ctx.globalAlpha = 0.9 * Math.sin(u * Math.PI);
      ctx.fillStyle = p.box;
      ctx.beginPath();
      ctx.arc(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  hubs.forEach((n, i) => {
    const k = ease((t - n.delay) / 700);
    if (k <= 0) return;
    ctx.globalAlpha = 0.9 * k;
    ctx.strokeStyle = p.box;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(H[i].x, H[i].y, n.r * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.18 * k;
    ctx.fillStyle = p.box;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}
