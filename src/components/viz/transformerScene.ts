// The transformer part of the hero background: input tokens on one side, a
// few stacked blocks in the middle (attention, then a per-token
// feed-forward, each wrapped by a residual connection), and processed tokens
// flowing out into the embedding field. Desktop runs left to right with the
// blocks stacked bottom to top, like the classic diagram; phones run top to
// bottom with fewer tokens and layers. No labels or text of any kind.

import type { Palette } from "./useCanvas";
import { rng } from "./math";

export type Kind = 0 | 1 | 2; // image patch, wave (audio / time series), text token
type P = { x: number; y: number };

export type Scene = {
  small: boolean;
  kinds: Kind[];
  inputs: P[]; // loose input row
  rows: P[][]; // token positions at each sub-layer boundary, in flow order
  blocks: { x: number; y: number; w: number; h: number }[]; // per sub-layer box
  residuals: { from: P; to: P; bulge: P }[]; // one per sub-layer
  exit: P; // where processed tokens head towards the embedding field
};

const SUB = 2; // sub-layers per block: attention, feed-forward

export function buildScene(w: number, h: number): Scene {
  // one-column layouts (phones, narrow tablets) run top to bottom
  const small = w < 832;
  const n = small ? 4 : 6;
  const layers = 2;
  const kinds: Kind[] = small ? [0, 1, 2, 0] : [0, 0, 1, 1, 2, 2];
  const rand = rng(41);
  const steps = layers * SUB;

  if (!small) {
    // Left to right through the open upper-right of the hero: a loose input
    // row right of the eyebrow, the stack rising bottom to top just above
    // the citation panel, and outputs flowing on into the field at the
    // right edge. The headline and panel stay clear.
    const cx = w * 0.78;
    const gap = Math.min(22, w * 0.016);
    const span = gap * (n - 1);
    const bottom = h * 0.42;
    const top = h * 0.07;
    const rowY = (r: number) => bottom - ((bottom - top) * r) / steps;
    const rows = Array.from({ length: steps + 1 }, (_, r) =>
      Array.from({ length: n }, (_, i) => ({ x: cx - span / 2 + gap * i, y: rowY(r) })),
    );
    const inputs = kinds.map((_, i) => ({
      x: w * (0.555 + (0.11 * i) / (n - 1)) + (rand() - 0.5) * 10,
      y: h * 0.17 + (rand() - 0.5) * 16,
    }));
    const pad = gap * 0.7;
    const blocks = Array.from({ length: steps }, (_, s) => ({
      x: cx - span / 2 - pad,
      y: rowY(s + 1) + 5,
      w: span + pad * 2,
      h: rowY(s) - rowY(s + 1) - 10,
    }));
    const residuals = blocks.map((b, s) => ({
      from: { x: b.x + b.w, y: rowY(s) },
      to: { x: b.x + b.w, y: rowY(s + 1) },
      bulge: { x: b.x + b.w + gap * 1.1, y: (rowY(s) + rowY(s + 1)) / 2 },
    }));
    return { small, kinds, inputs, rows, blocks, residuals, exit: { x: w * 0.93, y: h * 0.25 } };
  }

  // phones: top to bottom
  const gap = w * 0.16;
  const span = gap * (n - 1);
  const cx = w * 0.5;
  const first = h * 0.12;
  const last = h * 0.62;
  const rowY = (r: number) => first + ((last - first) * r) / steps;
  const rows = Array.from({ length: steps + 1 }, (_, r) =>
    Array.from({ length: n }, (_, i) => ({ x: cx - span / 2 + gap * i, y: rowY(r) })),
  );
  const inputs = kinds.map((_, i) => ({
    x: cx - span / 2 + gap * i + (rand() - 0.5) * 16,
    y: h * 0.035 + (rand() - 0.5) * 8,
  }));
  const pad = gap * 0.45;
  const blocks = Array.from({ length: steps }, (_, s) => ({
    x: cx - span / 2 - pad,
    y: rowY(s) + 6,
    w: span + pad * 2,
    h: rowY(s + 1) - rowY(s) - 12,
  }));
  const residuals = blocks.map((b, s) => ({
    from: { x: b.x + b.w, y: rowY(s) },
    to: { x: b.x + b.w, y: rowY(s + 1) },
    bulge: { x: b.x + b.w + gap * 0.45, y: (rowY(s) + rowY(s + 1)) / 2 },
  }));
  return { small, kinds, inputs, rows, blocks, residuals, exit: { x: w * 0.5, y: h * 0.85 } };
}

/* Attention ------------------------------------------------------------
   Each attention layer shows one head at a time; every few seconds it
   eases over to another head with a different pattern: local, global (all
   attend to the first image token), cross-modal (image ↔ text, audio ↔
   audio), and a sparse one. Rows of the matrix are queries. */
const HEAD_MS = 5200;
const BLEND_MS = 1400;

function headPattern(kind: number, kinds: Kind[], seed: number): number[][] {
  const n = kinds.length;
  const rand = rng(seed);
  const m = Array.from({ length: n }, (_, q) =>
    Array.from({ length: n }, (_, k) => {
      switch (kind % 4) {
        case 0:
          return Math.exp(-((q - k) ** 2) / 1.2); // local
        case 1:
          return k === 0 ? 2.5 : 0.15 + 0.2 * rand(); // global
        case 2:
          return kinds[q] !== kinds[k] ? 1 + rand() : 0.1; // cross-modal
        default:
          return rand() ** 4 * 3; // sparse
      }
    }),
  );
  return m.map((row) => {
    const s = row.reduce((a, b) => a + b, 0);
    return row.map((v) => v / s);
  });
}

export function attention(layer: number, t: number, kinds: Kind[]): number[][] {
  const slot = Math.floor(t / HEAD_MS);
  const into = t - slot * HEAD_MS;
  const a = headPattern(slot + layer * 2, kinds, slot * 13 + layer);
  if (into > BLEND_MS || slot === 0) return a;
  const prev = headPattern(slot - 1 + layer * 2, kinds, (slot - 1) * 13 + layer);
  const u = into / BLEND_MS;
  const e = u * u * (3 - 2 * u);
  return a.map((row, q) => row.map((v, k) => prev[q][k] + (v - prev[q][k]) * e));
}

/* Drawing --------------------------------------------------------------- */
const PASS_MS = 4600; // one forward pass rises through the stack

export function drawScene(
  ctx: CanvasRenderingContext2D,
  s: Scene,
  t: number,
  p: Palette,
  fade: (x: number, y: number) => number,
  pointer: P | null,
  outputs: P[], // positions in the embedding field that processed tokens join
) {
  const steps = s.rows.length - 1;
  const wave = ((t % PASS_MS) / PASS_MS) * (steps + 2.5) - 1; // -1 = still in the inputs
  const n = s.kinds.length;

  // the query under the pointer, if any (desktop only; pointer is null otherwise)
  let query: { row: number; i: number } | null = null;
  if (pointer) {
    let best = 26;
    s.rows.forEach((row, r) =>
      row.forEach((q, i) => {
        const d = Math.hypot(q.x - pointer.x, q.y - pointer.y);
        if (d < best && r > 0) {
          best = d;
          query = { row: r, i };
        }
      }),
    );
  }
  const q = query as { row: number; i: number } | null;

  // block outlines: attention and feed-forward boxes
  ctx.lineWidth = 0.75;
  s.blocks.forEach((b, i) => {
    ctx.globalAlpha = 0.22 * fade(b.x + b.w / 2, b.y + b.h / 2);
    ctx.strokeStyle = p.muted;
    roundRect(ctx, b.x, b.y, b.w, b.h, 3);
    ctx.stroke();
    // a slightly stronger outline around each attention + feed-forward pair
    if (i % SUB === 0) {
      const top = s.blocks[i + 1];
      const y0 = Math.min(b.y, top.y) - 4;
      const y1 = Math.max(b.y + b.h, top.y + top.h) + 4;
      ctx.globalAlpha = 0.14 * fade(b.x + b.w / 2, (y0 + y1) / 2);
      roundRect(ctx, b.x - 6, y0, b.w + 12, y1 - y0, 5);
      ctx.stroke();
    }
  });

  // residual connections curving around each sub-layer, with a merge node
  s.residuals.forEach((r, i) => {
    ctx.globalAlpha = 0.3 * fade(r.bulge.x, r.bulge.y);
    ctx.strokeStyle = p.muted;
    ctx.beginPath();
    ctx.moveTo(r.from.x - 4, r.from.y);
    ctx.quadraticCurveTo(r.bulge.x, r.from.y, r.bulge.x, r.bulge.y);
    ctx.quadraticCurveTo(r.bulge.x, r.to.y, r.to.x - 4, r.to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r.to.x - 4, r.to.y, 3, 0, Math.PI * 2);
    ctx.moveTo(r.to.x - 7, r.to.y);
    ctx.lineTo(r.to.x - 1, r.to.y);
    ctx.moveTo(r.to.x - 4, r.to.y - 3);
    ctx.lineTo(r.to.x - 4, r.to.y + 3);
    ctx.stroke();
    // pulse along the residual as the wave crosses this sub-layer
    const u = wave - i;
    if (u > 0 && u < 1) {
      const x = u < 0.5 ? qb(r.from.x - 4, r.bulge.x, r.bulge.x, u * 2) : qb(r.bulge.x, r.bulge.x, r.to.x - 4, u * 2 - 1);
      const y = u < 0.5 ? qb(r.from.y, r.from.y, r.bulge.y, u * 2) : qb(r.bulge.y, r.to.y, r.to.y, u * 2 - 1);
      ctx.globalAlpha = 0.8 * Math.sin(u * Math.PI) * fade(x, y);
      ctx.fillStyle = p.box;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // inputs feed the first row
  s.inputs.forEach((a, i) => {
    const b = s.rows[0][i];
    ctx.globalAlpha = 0.14 * fade((a.x + b.x) / 2, (a.y + b.y) / 2);
    ctx.strokeStyle = p.muted;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    if (s.small) ctx.lineTo(b.x, b.y);
    else ctx.bezierCurveTo(a.x + (b.x - a.x) * 0.5, a.y, b.x, a.y, b.x, b.y);
    ctx.stroke();
    if (wave > -1 && wave < 0) {
      const u = wave + 1;
      const x = s.small ? a.x + (b.x - a.x) * u : cb(a.x, a.x + (b.x - a.x) * 0.5, b.x, b.x, u);
      const y = s.small ? a.y + (b.y - a.y) * u : cb(a.y, a.y, a.y, b.y, u);
      ctx.globalAlpha = 0.7 * Math.sin(u * Math.PI) * fade(x, y);
      ctx.fillStyle = p.box;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // sub-layers: attention arcs (even steps) or straight per-token lines
  for (let st = 0; st < steps; st++) {
    const from = s.rows[st];
    const to = s.rows[st + 1];
    const u = wave - st;
    if (st % SUB === 0) {
      const A = attention(st / SUB, t, s.kinds);
      for (let qi = 0; qi < n; qi++) {
        for (let ki = 0; ki < n; ki++) {
          const wgt = A[qi][ki];
          const isQ = q !== null && q.row === st + 1 && q.i === qi;
          if (wgt < 0.08 && !isQ) continue;
          const a = from[ki];
          const b = to[qi];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const bend = s.small ? { x: mx + (ki - qi) * 4, y: my } : { x: mx, y: my + (ki - qi) * 4 };
          const dim = q !== null && !isQ ? 0.35 : 1;
          ctx.globalAlpha = Math.min(0.85, (0.06 + 0.7 * wgt) * dim * (isQ ? 1.6 : 1)) * fade(mx, my);
          ctx.strokeStyle = isQ ? p.box : wgt > 0.3 ? p.box : p.muted;
          ctx.lineWidth = 0.4 + 1.8 * wgt;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(bend.x, bend.y, b.x, b.y);
          ctx.stroke();
          // forward-pass pulses on the stronger arcs
          if (u > 0 && u < 1 && wgt > 0.22) {
            const x = qb(a.x, bend.x, b.x, u);
            const y = qb(a.y, bend.y, b.y, u);
            ctx.globalAlpha = 0.85 * Math.sin(u * Math.PI) * fade(x, y);
            ctx.fillStyle = p.box;
            ctx.beginPath();
            ctx.arc(x, y, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else {
      // feed-forward acts on each token separately
      ctx.lineWidth = 0.75;
      for (let i = 0; i < n; i++) {
        const a = from[i];
        const b = to[i];
        ctx.globalAlpha = 0.25 * fade(a.x, (a.y + b.y) / 2);
        ctx.strokeStyle = p.muted;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (u > 0 && u < 1) {
          ctx.globalAlpha = 0.8 * Math.sin(u * Math.PI) * fade(a.x, a.y);
          ctx.fillStyle = p.box;
          ctx.beginPath();
          ctx.arc(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // token nodes at every boundary, brightening as the wave reaches them
  s.rows.forEach((row, r) =>
    row.forEach((pt, i) => {
      const lit = Math.max(0, 1 - Math.abs(wave - r) * 1.3);
      const isQ = q !== null && q.row === r && q.i === i;
      ctx.globalAlpha = (0.45 + 0.45 * lit + (isQ ? 0.4 : 0)) * fade(pt.x, pt.y);
      glyph(ctx, s.kinds[i], pt.x, pt.y, 0.75, 0, i, isQ || lit > 0.5 ? p.box : kindColour(s.kinds[i], p));
    }),
  );

  // input tokens, drifting a little in their loose row
  s.inputs.forEach((a, i) => {
    const x = a.x + Math.sin(t * 0.0004 + i) * 3;
    const y = a.y + Math.cos(t * 0.00035 + i * 1.7) * 2;
    ctx.globalAlpha = 0.7 * fade(x, y);
    glyph(ctx, s.kinds[i], x, y, 1, 0, i, kindColour(s.kinds[i], p));
  });

  // processed tokens leave the last row and travel into the embedding field
  const last = s.rows[s.rows.length - 1];
  const EMIT = 900;
  const TRAVEL = 3600;
  for (let e = Math.floor((t - TRAVEL) / EMIT); e * EMIT <= t; e++) {
    if (e < 0 || !outputs.length) continue;
    const u = (t - e * EMIT) / TRAVEL;
    if (u < 0 || u > 1) continue;
    const i = e % n;
    const a = last[i];
    const b = outputs[(e * 7) % outputs.length];
    const c1 = s.small ? { x: a.x, y: a.y + 60 } : { x: a.x + 30, y: a.y - 40 };
    const c2 = s.small ? { x: b.x, y: b.y - 60 } : { x: b.x - 60, y: b.y };
    const k = u * u * (3 - 2 * u);
    const x = cb(a.x, c1.x, c2.x, b.x, k);
    const y = cb(a.y, c1.y, c2.y, b.y, k);
    ctx.globalAlpha = 0.75 * Math.sin(Math.min(1, u * 1.2) * Math.PI) * fade(x, y);
    glyph(ctx, s.kinds[i], x, y, 0.85, 0, e, kindColour(s.kinds[i], p));
  }
  ctx.globalAlpha = 1;
}

export function kindColour(kind: Kind, p: Palette) {
  return kind === 0 ? p.box : kind === 1 ? p.ink : p.muted;
}

/** One data point: a tiny square, a short wave segment or a small dash. */
export function glyph(
  ctx: CanvasRenderingContext2D,
  kind: Kind,
  x: number,
  y: number,
  scale: number,
  rot: number,
  phase: number,
  colour: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1 / scale;
  if (kind === 0) {
    ctx.strokeRect(-2, -2, 4, 4);
  } else if (kind === 1) {
    ctx.beginPath();
    for (let u = -5; u <= 5; u += 1) {
      const yy = Math.sin(u * 0.9 + phase) * 1.8;
      if (u === -5) ctx.moveTo(u, yy);
      else ctx.lineTo(u, yy);
    }
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-3.5, 0);
    ctx.lineTo(3.5, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const qb = (a: number, b: number, c: number, u: number) => (1 - u) ** 2 * a + 2 * (1 - u) * u * b + u * u * c;
const cb = (a: number, b: number, c: number, d: number, u: number) =>
  (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * c + u ** 3 * d;
