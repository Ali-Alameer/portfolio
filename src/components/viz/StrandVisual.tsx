"use client";

import { useRef } from "react";
import type { ThemeId } from "@/data/profile";
import { rng, useCanvas, type Frame } from "./useCanvas";
import styles from "./viz.module.css";

// A slow, live figure behind each research strand card, drawn like the
// output of the methods the strand describes. Purely decorative.
export default function StrandVisual({ kind }: { kind: ThemeId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useCanvas(ref, draws[kind]);
  return <canvas ref={ref} className={`${styles.canvas} ${styles.strand}`} aria-hidden="true" />;
}

const TAU = Math.PI * 2;

/* Animal welfare ------------------------------------------------------
   Pose keypoints on a few animals seen from above, each in a tracking box,
   with a faint trail of where its centre has been. */
const SKELETON: [number, number][] = [
  [1, 0], // snout
  [0.6, 0], // head
  [0.25, 0], // shoulders
  [-0.25, 0], // back
  [-0.6, 0], // hips
  [-0.85, 0], // tail
];
const LEGS: [number, number, number][] = [
  // x, side, gait phase
  [0.3, 1, 0],
  [0.3, -1, Math.PI],
  [-0.5, 1, Math.PI],
  [-0.5, -1, 0],
];

function livestock({ ctx, w, h, t, p }: Frame) {
  const s = Math.min(h * 0.22, w * 0.06);
  const pos = (i: number, time: number) => ({
    x: w * (0.64 + 0.27 * Math.sin(time * 0.00011 + i * 2.2)),
    y: h * (0.28 + 0.44 * (0.5 + 0.5 * Math.sin(time * 0.00008 + i * 1.7))),
  });

  for (let i = 0; i < 3; i++) {
    const c = pos(i, t);
    const ahead = pos(i, t + 400);
    const a = Math.atan2(ahead.y - c.y, ahead.x - c.x);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const at = (x: number, y: number) => ({ x: c.x + (x * cos - y * sin) * s, y: c.y + (x * sin + y * cos) * s });

    // trail of past centres
    ctx.lineWidth = 1;
    ctx.strokeStyle = p.box;
    for (let k = 1; k < 16; k++) {
      const a0 = pos(i, t - (k - 1) * 220);
      const a1 = pos(i, t - k * 220);
      ctx.globalAlpha = 0.28 * (1 - k / 16);
      ctx.beginPath();
      ctx.moveTo(a0.x, a0.y);
      ctx.lineTo(a1.x, a1.y);
      ctx.stroke();
    }

    const spine = SKELETON.map(([x, y]) => at(x, y));
    const legs = LEGS.map(([x, side, ph]) => {
      const swing = 0.18 * Math.sin(t * 0.004 + ph + i);
      return [at(x, 0), at(x + swing, side * 0.42)] as const;
    });

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = p.muted;
    ctx.beginPath();
    spine.forEach((q, k) => (k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    for (const [from, to] of legs) {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    }
    ctx.stroke();

    ctx.globalAlpha = 0.75;
    ctx.fillStyle = p.ink;
    for (const q of [...spine, ...legs.map((l) => l[1])]) {
      ctx.beginPath();
      ctx.arc(q.x, q.y, 1.6, 0, TAU);
      ctx.fill();
    }

    // tracking box around all keypoints, drawn as corner brackets
    const pts = [...spine, ...legs.map((l) => l[1])];
    const pad = 5;
    const x0 = Math.min(...pts.map((q) => q.x)) - pad;
    const y0 = Math.min(...pts.map((q) => q.y)) - pad;
    const x1 = Math.max(...pts.map((q) => q.x)) + pad;
    const y1 = Math.max(...pts.map((q) => q.y)) + pad;
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = p.box;
    brackets(ctx, x0, y0, x1 - x0, y1 - y0, 6);
  }
  ctx.globalAlpha = 1;
}

/* Multimodal AI -------------------------------------------------------
   A waveform scrolls in and is cut into a row of tokens; attention lines
   link a grid of image patches to those tokens, their weights shifting. */
function language({ ctx, w, h, t, p }: Frame) {
  const cols = 4;
  const rows = 3;
  const cell = Math.min(h * 0.19, w * 0.045, 20);
  const gx = w * 0.56;
  const gy = h * 0.08;
  const tokens = 7;
  const tw = Math.min(h * 0.15, w * 0.035, 15);
  const tGap = tw * 0.45;
  const tx0 = w * 0.97 - tokens * (tw + tGap) + tGap;
  const ty = h * 0.8;
  const waveL = w * 0.3;
  const waveR = tx0 - tGap * 2;

  // image patches, shaded by how much attention they currently draw
  const weight = (i: number, j: number) =>
    0.5 + 0.5 * Math.sin(t * 0.0006 + i * 1.3 + j * 2.1) * Math.cos(t * 0.00037 + j * 0.7);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const x = gx + c * cell;
      const y = gy + r * cell;
      const strongest = Math.max(...Array.from({ length: tokens }, (_, j) => weight(i, j)));
      ctx.globalAlpha = 0.06 + 0.22 * strongest;
      ctx.fillStyle = p.box;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = p.muted;
      ctx.lineWidth = 0.75;
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
  }

  // waveform
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = waveL; x <= waveR; x += 2) {
    const u = (x - waveL) / (waveR - waveL);
    const env = Math.sin(u * Math.PI);
    const y =
      ty +
      env *
        h *
        0.12 *
        (Math.sin(x * 0.09 - t * 0.004) * 0.6 + Math.sin(x * 0.23 - t * 0.007) * 0.3 + Math.sin(x * 0.041 + t * 0.002) * 0.4);
    if (x === waveL) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // tokens light up in turn as the signal reaches them
  const lit = (t * 0.0012) % (tokens + 3);
  for (let j = 0; j < tokens; j++) {
    const x = tx0 + j * (tw + tGap);
    const on = Math.max(0, 1 - Math.abs(lit - j) / 1.5);
    ctx.globalAlpha = 0.1 + 0.3 * on;
    ctx.fillStyle = p.box;
    ctx.fillRect(x, ty - tw / 2, tw, tw);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = p.box;
    ctx.strokeRect(x + 0.5, ty - tw / 2 + 0.5, tw - 1, tw - 1);
  }

  // attention lines from patches to tokens; only the stronger links show
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = p.box;
  for (let i = 0; i < rows * cols; i++) {
    const px = gx + (i % cols) * cell + cell / 2;
    const py = gy + Math.floor(i / cols) * cell + cell / 2;
    for (let j = 0; j < tokens; j++) {
      const a = weight(i, j);
      if (a < 0.82) continue;
      const qx = tx0 + j * (tw + tGap) + tw / 2;
      const qy = ty - tw / 2;
      ctx.globalAlpha = (a - 0.82) * 2.2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.bezierCurveTo(px, (py + qy) / 2, qx, (py + qy) / 2, qx, qy);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/* Fairness ------------------------------------------------------------
   Score distributions for two groups drift slowly into balance, hold,
   then ease apart again. */
function fairness({ ctx, w, h, t, p }: Frame) {
  const x0 = w * 0.32;
  const x1 = w * 0.96;
  const base = h * 0.86;
  const span = x1 - x0;
  const cycle = 16000;
  const ph = (t % cycle) / cycle;
  // 0 → 1 over the first 45%, hold, back to 0 over the last 25%
  const k =
    ph < 0.45 ? smooth(ph / 0.45) : ph < 0.75 ? 1 : 1 - smooth((ph - 0.75) / 0.25);
  const gap = (1 - k) * 0.22;
  const groups = [
    { mu: 0.5 - gap, sd: 0.11 + (1 - k) * 0.02, amp: 0.62 + (1 - k) * 0.12, color: p.box },
    { mu: 0.5 + gap, sd: 0.11, amp: 0.62 - (1 - k) * 0.12, color: p.live },
  ];

  // axis with ticks
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, base + 0.5);
  ctx.lineTo(x1, base + 0.5);
  for (let i = 0; i <= 10; i++) {
    const x = Math.round(x0 + (span * i) / 10) + 0.5;
    ctx.moveTo(x, base);
    ctx.lineTo(x, base + (i % 5 === 0 ? 5 : 3));
  }
  ctx.stroke();

  for (const g of groups) {
    const y = (u: number) => base - h * g.amp * Math.exp(-((u - g.mu) ** 2) / (2 * g.sd ** 2));
    ctx.beginPath();
    ctx.moveTo(x0, base);
    for (let i = 0; i <= 120; i++) {
      const u = i / 120;
      ctx.lineTo(x0 + u * span, y(u));
    }
    ctx.lineTo(x1, base);
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = g.color;
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    // mean marker
    const mx = x0 + g.mu * span;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(mx, base);
    ctx.lineTo(mx, y(g.mu) - 6);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
}

/* Biologically inspired vision ---------------------------------------
   Oriented Gabor-like filters feed pooled units, which feed a few
   outputs; pulses carry activity forward layer by layer. */
const ORIENT = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];

function vision({ ctx, w, h, t, p }: Frame) {
  const r = Math.min(h * 0.09, w * 0.022, 10);
  const l1 = grid(w * 0.46, h * 0.18, 5, 3, r * 2.6);
  const l2 = grid(w * 0.72, h * 0.3, 3, 2, r * 2.6);
  const l3 = grid(w * 0.9, h * 0.18, 1, 3, r * 2.6);
  const rand = rng(7);
  const links1 = l2.flatMap((b) => l1.filter(() => rand() < 0.35).map((a) => [a, b] as const));
  const links2 = l3.flatMap((b) => l2.map((a) => [a, b] as const));

  ctx.lineWidth = 0.75;
  ctx.strokeStyle = p.muted;
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  for (const [a, b] of [...links1, ...links2]) {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  // layer 1: oriented filters with drifting phase
  l1.forEach((c, i) => {
    const ang = ORIENT[i % ORIENT.length];
    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, TAU);
    ctx.clip();
    ctx.translate(c.x, c.y);
    ctx.rotate(ang);
    const shift = ((t * 0.006 + i) % 4) - 2;
    for (let k = -3; k <= 3; k++) {
      const x = k * (r / 2.2) + shift;
      ctx.globalAlpha = 0.55 * Math.exp(-((x / r) ** 2) * 1.6);
      ctx.strokeStyle = k % 2 ? p.muted : p.box;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, -r);
      ctx.lineTo(x, r);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, TAU);
    ctx.stroke();
  });

  // layer 2: pooling units; layer 3: outputs
  ctx.globalAlpha = 0.5;
  for (const c of l2) ctx.strokeRect(c.x - r * 0.6, c.y - r * 0.6, r * 1.2, r * 1.2);
  ctx.fillStyle = p.ink;
  for (const c of l3) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, 2.2, 0, TAU);
    ctx.fill();
  }

  // pulses: one wave every few seconds, layer 1 → 2 then 2 → 3
  const period = 4200;
  const ph = (t % period) / period;
  ctx.fillStyle = p.box;
  const pulse = (links: readonly (readonly [Pt, Pt])[], from: number, to: number) => {
    if (ph < from || ph > to) return;
    const u = smooth((ph - from) / (to - from));
    ctx.globalAlpha = 0.85 * Math.sin(u * Math.PI);
    for (const [a, b] of links) {
      ctx.beginPath();
      ctx.arc(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 1.7, 0, TAU);
      ctx.fill();
    }
  };
  pulse(links1, 0.05, 0.45);
  pulse(links2, 0.45, 0.8);
  ctx.globalAlpha = 1;
}

type Pt = { x: number; y: number };

function grid(cx: number, top: number, cols: number, rows: number, step: number): Pt[] {
  const out: Pt[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out.push({ x: cx + (c - (cols - 1) / 2) * step, y: top + r * step });
  return out;
}

function smooth(x: number) {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
}

export function brackets(ctx: CanvasRenderingContext2D, x: number, y: number, bw: number, bh: number, c: number) {
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
  ctx.moveTo(x + bw - c, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + c);
  ctx.moveTo(x + bw, y + bh - c); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw - c, y + bh);
  ctx.moveTo(x + c, y + bh); ctx.lineTo(x, y + bh); ctx.lineTo(x, y + bh - c);
  ctx.stroke();
}

const draws: Record<ThemeId, (f: Frame) => void> = { livestock, language, fairness, vision };
