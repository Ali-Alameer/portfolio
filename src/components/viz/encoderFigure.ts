// A faithful, simplified transformer encoder (after "Attention Is All You
// Need", fig. 1), drawn as a running figure. The numbers are computed, not
// decorative: a seeded 4×4 input embedding plus sinusoidal positional
// encodings; single-head scaled dot-product attention softmax(QKᵀ/√d) with
// V = the encoded input; residual + layer norm; a ReLU feed-forward layer;
// a second residual + layer norm; then a softmax over five outputs from the
// mean-pooled result. Displayed attention rows and output probabilities are
// rounded so that each sums to exactly 1.00.
//
// Drawing happens in a fixed design space (W0 × H0 units) that the caller
// scales into place. Flow runs bottom to top, like the original diagram.

import { rng } from "./math";
import type { Palette } from "./useCanvas";

export const W0 = 440;
export const H0 = 360;
export const LOOP = 12500; // ms per forward pass

const N = 4; // tokens
const D = 4; // model width
const HIDDEN = 6; // feed-forward width
const CLASSES = 5;

type Mat = number[][];

/* Maths ----------------------------------------------------------------- */
const matmul = (a: Mat, b: Mat) => a.map((r) => b[0].map((_, j) => r.reduce((s, v, k) => s + v * b[k][j], 0)));
const transpose = (a: Mat) => a[0].map((_, j) => a.map((r) => r[j]));
const softmax = (v: number[]) => {
  const m = Math.max(...v);
  const e = v.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
};
const layerNorm = (v: number[]) => {
  const mu = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length + 1e-5);
  return v.map((x) => (x - mu) / sd);
};
const relu = (x: number) => Math.max(0, x);

/** Round probabilities to two decimals so they still sum to exactly 1.00. */
function roundToOne(p: number[]) {
  const c = p.map((x) => x * 100);
  const fl = c.map(Math.floor);
  let rest = 100 - fl.reduce((a, b) => a + b, 0);
  const order = c.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    fl[i] += 1;
    rest -= 1;
  }
  return fl.map((x) => x / 100);
}

const randMat = (rand: () => number, r: number, c: number, scale: number) =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => (rand() * 2 - 1) * scale));
const r2 = (x: number) => Math.round(x * 100) / 100;

// fixed "trained" weights; only the input changes from loop to loop
const W = (() => {
  const rand = rng(77);
  return {
    q: randMat(rand, D, D, 0.9),
    k: randMat(rand, D, D, 0.9),
    w1: randMat(rand, D, HIDDEN, 0.8),
    w2: randMat(rand, HIDDEN, D, 0.8),
    out: randMat(rand, D, CLASSES, 1.1),
  };
})();

export type Pass = {
  x: Mat; // input embedding (2 dp)
  xpe: Mat; // + positional encoding (2 dp)
  attn: Mat; // rows sum to 1.00 exactly
  h1: number[]; // feed-forward hidden activations (mean over tokens), 0..1
  h2: number[]; // feed-forward output magnitudes, 0..1
  probs: number[]; // sums to 1.00 exactly
};

export function forward(loop: number): Pass {
  const rand = rng(300 + (loop % 9) * 31);
  const x = randMat(rand, N, D, 0.9).map((r) => r.map(r2));
  const pe = Array.from({ length: N }, (_, pos) =>
    Array.from({ length: D }, (_, i) => {
      const f = pos / Math.pow(10000, (i - (i % 2)) / D);
      return i % 2 ? Math.cos(f) : Math.sin(f);
    }),
  );
  const xpe = x.map((r, i) => r.map((v, j) => r2(v + pe[i][j])));
  const q = matmul(xpe, W.q);
  const k = matmul(xpe, W.k);
  const scores = matmul(q, transpose(k)).map((r) => r.map((v) => v / Math.sqrt(D)));
  const a = scores.map(softmax);
  const z = matmul(a, xpe); // V = encoded input
  const n1 = xpe.map((r, i) => layerNorm(r.map((v, j) => v + z[i][j])));
  const hid = matmul(n1, W.w1).map((r) => r.map(relu));
  const ffo = matmul(hid, W.w2);
  const n2 = n1.map((r, i) => layerNorm(r.map((v, j) => v + ffo[i][j])));
  const pooled = n2[0].map((_, j) => n2.reduce((s, r) => s + r[j], 0) / N);
  const logits = matmul([pooled], W.out)[0];
  const meanCols = (m: Mat) => m[0].map((_, j) => m.reduce((s, r) => s + Math.abs(r[j]), 0) / m.length);
  const norm = (v: number[]) => {
    const m = Math.max(...v, 1e-6);
    return v.map((x) => x / m);
  };
  return {
    x,
    xpe,
    attn: a.map(roundToOne),
    h1: norm(meanCols(hid)),
    h2: norm(meanCols(ffo)),
    probs: roundToOne(softmax(logits)),
  };
}

/* Layout (design units) -------------------------------------------------- */
const CX = 225; // tower centre
const TW = 150; // tower width
const BOX = {
  softmax: { y: 68, h: 16 },
  add2: { y: 114, h: 16 },
  ff: { y: 140, h: 26 },
  add1: { y: 184, h: 16 },
  mha: { y: 210, h: 28 },
};
const FRAME = { x: CX - TW / 2 - 15, y: 104, w: TW + 30, h: 160 };
const SPLIT_Y = 256;
const PLUS = { x: CX, y: 280 };
const MATRIX = { x: CX - 72, y: 298, cw: 36, ch: 14 };
const HEAT = { x: 326, y: 196, cw: 28, ch: 14 };
const FF_L1 = { x: 352, y0: 132, y1: 176 };
const FF_L2 = { x: 412, y0: 138, y1: 170 };
const BARS = { base: 58, max: 40, w: 16, gap: 8 };

// the main path the highlight travels, bottom to top, one anchor per stage
const PATH = [
  { y: MATRIX.y }, // input
  { y: PLUS.y }, // + positional encoding
  { y: SPLIT_Y }, // Q, K, V
  { y: BOX.mha.y + BOX.mha.h / 2 }, // attention
  { y: BOX.add1.y + BOX.add1.h / 2 }, // add & norm
  { y: BOX.ff.y + BOX.ff.h / 2 }, // feed forward
  { y: BOX.add2.y + BOX.add2.h / 2 }, // add & norm
  { y: BOX.softmax.y + BOX.softmax.h / 2 }, // softmax
];
// stage boundaries in ms: input, pe, qkv, attn, add1, ff, add2, out, then hold
const STAGES = [0, 1300, 2300, 3300, 5600, 6400, 8100, 8900, 10900];
type Stage = "input" | "pe" | "qkv" | "attn" | "add1" | "ff" | "add2" | "out" | "hold";
const NAMES: Stage[] = ["input", "pe", "qkv", "attn", "add1", "ff", "add2", "out", "hold"];

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const ease = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const fmt = (v: number) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(2);

/* Drawing ---------------------------------------------------------------- */
export function drawEncoder(ctx: CanvasRenderingContext2D, t: number, p: Palette, mono: string, s: number) {
  const loop = Math.floor(t / LOOP);
  const lt = t - loop * LOOP;
  const data = forward(loop);
  let si = STAGES.length - 1;
  while (lt < STAGES[si]) si--;
  const stage = NAMES[si];
  const sp = si < STAGES.length - 1 ? (lt - STAGES[si]) / (STAGES[si + 1] - STAGES[si]) : 0;
  const reached = (name: Stage) => NAMES.indexOf(name) <= si;
  // everything data-bearing fades out over the last moments of the loop
  const tail = 1 - ease((lt - (LOOP - 700)) / 700);
  const hair = 1 / s;

  const grey = p.muted;
  const quiet = p.line;
  const accent = p.box;
  const on = (name: Stage) => stage === name;

  const label = (text: string, x: number, y: number, active: boolean, align: CanvasTextAlign = "center", size = 9.5) => {
    ctx.font = `500 ${size}px ${mono}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.globalAlpha = active ? 1 : 0.62;
    ctx.fillStyle = active ? accent : grey;
    ctx.fillText(text, x, y);
  };
  const box = (b: { y: number; h: number }, text: string, active: boolean) => {
    ctx.globalAlpha = active ? 0.95 : 0.55;
    ctx.strokeStyle = active ? accent : grey;
    ctx.lineWidth = hair;
    roundRect(ctx, CX - TW / 2, b.y, TW, b.h, 2);
    ctx.stroke();
    label(text, CX, b.y + b.h / 2 + 0.5, active);
  };
  const line = (x0: number, y0: number, x1: number, y1: number, active: boolean, dash?: number[]) => {
    ctx.globalAlpha = active ? 0.9 : 0.5;
    ctx.strokeStyle = active ? accent : quiet;
    ctx.lineWidth = hair;
    ctx.setLineDash(dash ?? []);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const arrowHead = (x: number, y: number, active: boolean) => {
    ctx.globalAlpha = active ? 0.9 : 0.5;
    ctx.fillStyle = active ? accent : quiet;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2.5, y + 4);
    ctx.lineTo(x + 2.5, y + 4);
    ctx.closePath();
    ctx.fill();
  };

  /* main vertical path, with arrowheads into each box */
  line(CX, MATRIX.y - 2, CX, PLUS.y + 7, on("pe"));
  line(CX, PLUS.y - 7, CX, SPLIT_Y, on("qkv"));
  line(CX, BOX.mha.y, CX, BOX.add1.y + BOX.add1.h, on("add1"));
  arrowHead(CX, BOX.add1.y + BOX.add1.h, on("add1"));
  line(CX, BOX.add1.y, CX, BOX.ff.y + BOX.ff.h, on("ff"));
  arrowHead(CX, BOX.ff.y + BOX.ff.h, on("ff"));
  line(CX, BOX.ff.y, CX, BOX.add2.y + BOX.add2.h, on("add2"));
  arrowHead(CX, BOX.add2.y + BOX.add2.h, on("add2"));
  line(CX, BOX.add2.y, CX, BOX.softmax.y + BOX.softmax.h, on("out"));
  arrowHead(CX, BOX.softmax.y + BOX.softmax.h, on("out"));

  /* Q, K, V branches into attention */
  [-35, 0, 35].forEach((dx, i) => {
    const active = on("qkv");
    line(CX, SPLIT_Y, CX + dx, BOX.mha.y + BOX.mha.h + 4, active);
    arrowHead(CX + dx, BOX.mha.y + BOX.mha.h, active);
    label(["Q", "K", "V"][i], CX + dx + (dx <= 0 ? -7 : 7), SPLIT_Y - 9, active, "center", 8.5);
  });

  /* residual connections curving round the left of each sub-layer */
  const residual = (from: number, to: number, active: boolean) => {
    const x = CX - TW / 2;
    ctx.globalAlpha = active ? 0.9 : 0.45;
    ctx.strokeStyle = active ? accent : quiet;
    ctx.lineWidth = hair;
    ctx.beginPath();
    ctx.moveTo(CX, from);
    ctx.lineTo(x + 8, from);
    ctx.quadraticCurveTo(x - 8, from, x - 8, from - 12);
    ctx.lineTo(x - 8, to + 8);
    ctx.quadraticCurveTo(x - 8, to, x, to);
    ctx.stroke();
  };
  residual(SPLIT_Y + 2, BOX.add1.y + BOX.add1.h / 2, on("add1"));
  residual(BOX.add1.y - 4, BOX.add2.y + BOX.add2.h / 2, on("add2"));

  /* encoder layer frame, repeated N times */
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = grey;
  ctx.lineWidth = hair;
  roundRect(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, 6);
  ctx.stroke();
  label("N×", FRAME.x - 12, FRAME.y + FRAME.h / 2, false, "right", 9);

  box(BOX.mha, "Multi-Head Attention", on("attn"));
  box(BOX.add1, "Add & Norm", on("add1"));
  box(BOX.ff, "Feed Forward", on("ff"));
  box(BOX.add2, "Add & Norm", on("add2"));
  box(BOX.softmax, "softmax", on("out"));

  /* positional encoding: ⊕ with a small sinusoid beside it */
  {
    const active = on("pe");
    ctx.globalAlpha = active ? 0.95 : 0.55;
    ctx.strokeStyle = active ? accent : grey;
    ctx.lineWidth = hair;
    ctx.beginPath();
    ctx.arc(PLUS.x, PLUS.y, 7, 0, Math.PI * 2);
    ctx.moveTo(PLUS.x - 4, PLUS.y);
    ctx.lineTo(PLUS.x + 4, PLUS.y);
    ctx.moveTo(PLUS.x, PLUS.y - 4);
    ctx.lineTo(PLUS.x, PLUS.y + 4);
    ctx.stroke();
    ctx.beginPath();
    for (let u = 0; u <= 1; u += 0.02) {
      const x = PLUS.x - 52 + u * 34;
      const y = PLUS.y - Math.sin(u * Math.PI * 3) * 5;
      if (u === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    line(PLUS.x - 16, PLUS.y, PLUS.x - 7, PLUS.y, active);
    label("Positional", PLUS.x - 58, PLUS.y - 5.5, active, "right", 8.5);
    label("Encoding", PLUS.x - 58, PLUS.y + 5.5, active, "right", 8.5);
  }

  /* input embedding matrix, which becomes X + PE once the encoding is added */
  {
    const active = on("input") || on("pe");
    const showPe = reached("pe") && (stage !== "pe" || sp > 0.5);
    const m = showPe ? data.xpe : data.x;
    const appear = stage === "input" ? ease(sp * 1.6) : 1;
    ctx.globalAlpha = (active ? 0.9 : 0.45) * tail;
    ctx.strokeStyle = active ? accent : grey;
    ctx.lineWidth = hair;
    ctx.strokeRect(MATRIX.x, MATRIX.y, MATRIX.cw * D, MATRIX.ch * N);
    for (let i = 0; i < N; i++)
      for (let j = 0; j < D; j++) {
        ctx.font = `400 8.5px ${mono}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = p.ink;
        const rowIn = stage === "input" ? ease(sp * 2.2 - i * 0.3) : 1;
        ctx.globalAlpha = 0.78 * appear * rowIn * tail;
        ctx.fillText(fmt(m[i][j]), MATRIX.x + MATRIX.cw * (j + 0.5), MATRIX.y + MATRIX.ch * (i + 0.5) + 0.5);
      }
    label("Input Embedding", MATRIX.x - 8, MATRIX.y + (MATRIX.ch * N) / 2, active, "right", 8.5);
  }

  /* attention matrix: a heatmap filled row by row, each row softmax-normalised */
  {
    const active = on("attn");
    line(CX + TW / 2, BOX.mha.y + BOX.mha.h / 2, HEAT.x - 4, BOX.mha.y + BOX.mha.h / 2, active, [2, 2]);
    ctx.globalAlpha = (active ? 0.9 : 0.45) * tail;
    ctx.strokeStyle = active ? accent : grey;
    ctx.lineWidth = hair;
    ctx.strokeRect(HEAT.x, HEAT.y, HEAT.cw * N, HEAT.ch * N);
    for (let i = 0; i < N; i++) {
      const fill = !reached("attn") ? 0 : stage === "attn" ? ease(sp * N - i) : 1;
      for (let j = 0; j < N; j++) {
        const v = data.attn[i][j];
        if (fill <= 0) continue;
        ctx.globalAlpha = (0.08 + 0.7 * v) * fill * tail;
        ctx.fillStyle = accent;
        ctx.fillRect(HEAT.x + HEAT.cw * j + 0.5, HEAT.y + HEAT.ch * i + 0.5, HEAT.cw - 1, HEAT.ch - 1);
        ctx.font = `400 8px ${mono}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.9 * fill * tail;
        ctx.fillStyle = p.ink;
        ctx.fillText(v.toFixed(2), HEAT.x + HEAT.cw * (j + 0.5), HEAT.y + HEAT.ch * (i + 0.5) + 0.5);
      }
    }
  }

  /* feed-forward: two dense layers whose neurons light as data passes */
  {
    const active = on("ff");
    const ys = (n: number, y0: number, y1: number) => Array.from({ length: n }, (_, i) => y0 + ((y1 - y0) * i) / (n - 1));
    const l1 = ys(HIDDEN, FF_L1.y0, FF_L1.y1);
    const l2 = ys(D, FF_L2.y0, FF_L2.y1);
    line(CX + TW / 2, BOX.ff.y + BOX.ff.h / 2, FF_L1.x - 10, BOX.ff.y + BOX.ff.h / 2, active, [2, 2]);
    ctx.lineWidth = hair;
    for (const a of l1)
      for (const b of l2) {
        ctx.globalAlpha = active ? 0.35 : 0.2;
        ctx.strokeStyle = active ? accent : quiet;
        ctx.beginPath();
        ctx.moveTo(FF_L1.x, a);
        ctx.lineTo(FF_L2.x, b);
        ctx.stroke();
      }
    const neuron = (x: number, y: number, level: number) => {
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = grey;
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.stroke();
      if (level > 0) {
        ctx.globalAlpha = level * tail;
        ctx.fillStyle = accent;
        ctx.fill();
      }
    };
    const k1 = !reached("ff") ? 0 : stage === "ff" ? ease(sp * 2) : 1;
    const k2 = !reached("ff") ? 0 : stage === "ff" ? ease(sp * 2 - 1) : 1;
    l1.forEach((y, i) => neuron(FF_L1.x, y, k1 * (0.15 + 0.8 * data.h1[i])));
    l2.forEach((y, i) => neuron(FF_L2.x, y, k2 * (0.15 + 0.8 * data.h2[i])));
  }

  /* output probabilities above softmax */
  {
    const active = on("out");
    const grow = !reached("out") ? 0 : stage === "out" ? ease(sp * 1.4) : 1;
    const total = CLASSES * BARS.w + (CLASSES - 1) * BARS.gap;
    const x0 = CX - total / 2;
    const maxP = Math.max(...data.probs);
    line(x0 - 4, BARS.base + 0.5, x0 + total + 4, BARS.base + 0.5, false);
    data.probs.forEach((v, i) => {
      const x = x0 + i * (BARS.w + BARS.gap);
      const hgt = (v / maxP) * BARS.max * grow;
      ctx.globalAlpha = (active ? 0.85 : 0.55) * tail;
      ctx.fillStyle = active || v === maxP ? accent : grey;
      if (hgt > 0) ctx.fillRect(x, BARS.base - hgt, BARS.w, hgt);
      if (grow > 0.6) {
        ctx.font = `400 8px ${mono}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.globalAlpha = 0.85 * ease((grow - 0.6) / 0.4) * tail;
        ctx.fillStyle = p.ink;
        ctx.fillText(v.toFixed(2), x + BARS.w / 2, BARS.base - hgt - 3);
      }
    });
  }

  /* the single highlight travelling up the main path */
  if (si < PATH.length) {
    const a = PATH[si];
    const b = PATH[Math.min(si + 1, PATH.length - 1)];
    const y = a.y + (b.y - a.y) * ease(sp);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(CX, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
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
