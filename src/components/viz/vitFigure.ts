// A vision transformer reading a ceiling-camera frame of a pig pen, drawn as
// a running research figure, from image to prediction:
//
//   image → 4×4 patches → one patch's pixels (zoomed, then flattened) →
//   patch tokens with a [CLS] token in front → Patch + Position Embedding
//   (⊕ sinusoidal encoding) → encoder block ×N (Multi-Head Attention,
//   Add & Norm, Feed Forward, Add & Norm) → two heads: segmentation (patch
//   tokens back on the grid, a mask outline round the pig) and behaviour
//   (softmax over drinking / feeding / lying / standing from [CLS]), shown as
//   a detection box like the research cards.
//
// The numbers are computed from the drawn scene, not made up: pixel values
// are sampled from the picture (0–255), patch embeddings come from those
// pixels, the [CLS] attention row is a softmax over the 16 patches (shown as
// the 4×4 grid, and projected back onto the image), and the behaviour
// probabilities are a softmax. Displayed rows and probabilities are rounded
// so they sum to exactly 1.00. Each loop the pig moves and changes posture,
// and the prediction follows. Drawn in a fixed design space (W0 × H0).

import { rng } from "./math";
import type { Palette } from "./useCanvas";

export const W0 = 440;
export const H0 = 372;
export const LOOP = 18000;

const CLASSES = ["drinking", "feeding", "lying", "standing"] as const;
const G = 4; // patches per side

/* Layout (design units) -------------------------------------------------- */
const IMG = { x: 4, y: 226, s: 132 };
const PS = IMG.s / G; // patch size
const CX = 240; // encoder tower centre
const TW = 136;
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
const TOK = { x: CX - 62, y: 293, w: 7.3, h: 7 }; // 17 tokens
const MAT = { x: CX - 62, y: 312, cw: 31, ch: 11 }; // [CLS], p1–p3, ⋮
const CALL = { x: 10, y: 16, cw: 27, ch: 16 }; // zoomed pixels
const FLAT = { x: 4, y: 100, step: 17.5 };
const HEAT = { x: 336, y: 196, cw: 25, ch: 14 };
const FF_L1 = { x: 352, y0: 132, y1: 176 };
const FF_L2 = { x: 412, y0: 138, y1: 170 };
const BARS = { x: 374, y: 22, row: 14, max: 38 };

// stage boundaries (ms) within one loop
const T = {
  image: 0,
  grid: 1800,
  zoom: 2800,
  flatten: 4000,
  tokens: 5000,
  embed: 6600,
  qkv: 7700,
  attn: 8500,
  project: 10200,
  add1: 11200,
  ff: 11900,
  add2: 13200,
  out: 13900,
  detect: 15500,
  hold: 16600,
};
type Stage = keyof typeof T;
const ORDER = Object.keys(T) as Stage[];

/* Scene ------------------------------------------------------------------ */
type Pose = { cx: number; cy: number; a: number; lying: boolean; cls: number };

// three situations the loops cycle through, with a little variation
function poseFor(loop: number): Pose {
  const rand = rng(900 + loop * 17);
  const j = () => (rand() - 0.5) * 6;
  const drinker = { x: IMG.x + IMG.s - 11, y: IMG.y + 20 };
  switch (loop % 3) {
    case 0: {
      const cx = IMG.x + IMG.s * 0.66 + j();
      const cy = IMG.y + IMG.s * 0.4 + j();
      return { cx, cy, a: Math.atan2(drinker.y - cy, drinker.x - cx), lying: false, cls: 0 };
    }
    case 1:
      return { cx: IMG.x + IMG.s * 0.36 + j(), cy: IMG.y + IMG.s * 0.56 + j(), a: Math.PI / 2, lying: false, cls: 1 };
    default:
      return { cx: IMG.x + IMG.s * 0.42 + j(), cy: IMG.y + IMG.s * 0.34 + j(), a: 0.35 + j() / 20, lying: true, cls: 2 };
  }
}

// body and head as ellipses in the pig's own frame (head towards +x)
const shape = (lying: boolean) => ({
  body: { cx: 0, a: lying ? 22 : 24, b: lying ? 14 : 11.5 },
  head: { cx: lying ? 25 : 27, a: 9, b: 7.5 },
});

function rayEllipse(c: number, s: number, e: { cx: number; a: number; b: number }) {
  const A = (c * c) / (e.a * e.a) + (s * s) / (e.b * e.b);
  const B = (2 * c * e.cx) / (e.a * e.a);
  const C = (e.cx * e.cx) / (e.a * e.a) - 1;
  const disc = B * B - 4 * A * C;
  return disc < 0 ? 0 : (B + Math.sqrt(disc)) / (2 * A);
}

const reach = (pose: Pose, th: number) => {
  const sh = shape(pose.lying);
  const c = Math.cos(th);
  const s = Math.sin(th);
  return Math.max(rayEllipse(c, s, sh.body), rayEllipse(c, s, sh.head));
};

function insidePig(pose: Pose, x: number, y: number) {
  const dx = x - pose.cx;
  const dy = y - pose.cy;
  const lx = dx * Math.cos(-pose.a) - dy * Math.sin(-pose.a);
  const ly = dx * Math.sin(-pose.a) + dy * Math.cos(-pose.a);
  return Math.hypot(lx, ly) <= reach(pose, Math.atan2(ly, lx));
}

const FEEDER = { x: IMG.x + 12, y: IMG.y + IMG.s - 15, w: 58, h: 8 };
const DRINKER = { x: IMG.x + IMG.s - 11, y: IMG.y + 20, r: 4 };

// grey level (0–255) of the scene at a point, as a camera would record it
function brightness(pose: Pose, x: number, y: number) {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const noise = (h - Math.floor(h) - 0.5) * 12;
  let v: number;
  if (insidePig(pose, x, y)) v = 186 + 10 * Math.cos((x + y) / 6);
  else if (Math.hypot(x - DRINKER.x, y - DRINKER.y) <= DRINKER.r) v = 48;
  else if (x >= FEEDER.x && x <= FEEDER.x + FEEDER.w && y >= FEEDER.y && y <= FEEDER.y + FEEDER.h) v = 74;
  else if (x - IMG.x < 3 || IMG.x + IMG.s - x < 3 || y - IMG.y < 3 || IMG.y + IMG.s - y < 3) v = 60;
  else v = 112 + 9 * Math.sin(x * 0.7) * Math.cos(y * 0.55); // straw bedding
  return Math.max(0, Math.min(255, Math.round(v + noise)));
}

/* Model ----------------------------------------------------------------- */
const softmax = (v: number[]) => {
  const m = Math.max(...v);
  const e = v.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
};

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

const WE = (() => {
  const rand = rng(55);
  return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => (rand() * 2 - 1) * 0.9));
})();
const CLS_E = [0.12, -0.31, 0.27, 0.05];
const r2 = (x: number) => Math.round(x * 100) / 100;
const pe = (pos: number, i: number) => {
  const f = pos / Math.pow(10000, (i - (i % 2)) / 4);
  return i % 2 ? Math.cos(f) : Math.sin(f);
};

type Run = {
  pose: Pose;
  coverage: number[]; // fraction of each patch that is pig
  zoom: number; // patch shown up close
  pixels: number[][]; // 4×4 samples of that patch, 0–255
  emb: number[][]; // [CLS], p1–p3 (2 dp)
  embPe: number[][]; // + position (2 dp)
  attn: number[]; // [CLS] attention over 16 patches, sums to 1.00
  probs: number[]; // behaviour, sums to 1.00
  ff1: number[];
  ff2: number[];
  outline: { x: number; y: number }[];
  bbox: { x: number; y: number; w: number; h: number };
};

const cache = new Map<number, Run>();

function run(loop: number): Run {
  const hit = cache.get(loop);
  if (hit) return hit;
  const pose = poseFor(loop);
  const rand = rng(4000 + loop * 29);

  const coverage = Array.from({ length: G * G }, (_, k) => {
    const px = IMG.x + (k % G) * PS;
    const py = IMG.y + Math.floor(k / G) * PS;
    let n = 0;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (insidePig(pose, px + (i + 0.5) * (PS / 6), py + (j + 0.5) * (PS / 6))) n++;
    return n / 36;
  });
  const zoom = coverage.indexOf(Math.max(...coverage));
  const zx = IMG.x + (zoom % G) * PS;
  const zy = IMG.y + Math.floor(zoom / G) * PS;
  const pixels = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => brightness(pose, zx + (c + 0.5) * (PS / 4), zy + (r + 0.5) * (PS / 4))),
  );

  // patch features → embedding, for the first three patches shown
  const patchEmb = (k: number) => {
    let sum = 0;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        sum += brightness(pose, IMG.x + (k % G) * PS + (i + 0.5) * (PS / 4), IMG.y + Math.floor(k / G) * PS + (j + 0.5) * (PS / 4));
    const f = [sum / 16 / 255 - 0.5, coverage[k], (k % G) / 3 - 0.5, Math.floor(k / G) / 3 - 0.5];
    return WE.map((row) => r2(row.reduce((s, w, i) => s + w * f[i], 0)));
  };
  const emb = [CLS_E, patchEmb(0), patchEmb(1), patchEmb(2)];
  const embPe = emb.map((row, pos) => row.map((v, i) => r2(v + pe(pos, i))));

  // [CLS] attends to the patches where the pig is
  const attn = roundToOne(softmax(coverage.map((c) => 3.2 * c + (rand() - 0.5) * 0.4)));

  // behaviour logits: the posture and place decide the class
  const logits = [0, 0, 0, 0].map(() => 0.6 + rand() * 0.9);
  logits[pose.cls] += 3.4 + rand() * 0.6;
  if (pose.cls !== 2) logits[3] += 0.9; // a pig at the drinker or feeder is also standing
  const probs = roundToOne(softmax(logits));

  const ff1 = Array.from({ length: 6 }, () => 0.15 + 0.85 * rand());
  const ff2 = Array.from({ length: 4 }, () => 0.15 + 0.85 * rand());

  const outline = Array.from({ length: 72 }, (_, i) => {
    const th = (i / 72) * Math.PI * 2;
    const r = reach(pose, th) + 2;
    const lx = Math.cos(th) * r;
    const ly = Math.sin(th) * r;
    return {
      x: pose.cx + lx * Math.cos(pose.a) - ly * Math.sin(pose.a),
      y: pose.cy + lx * Math.sin(pose.a) + ly * Math.cos(pose.a),
    };
  });
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const bbox = {
    x: Math.min(...xs) - 3,
    y: Math.min(...ys) - 3,
    w: Math.max(...xs) - Math.min(...xs) + 6,
    h: Math.max(...ys) - Math.min(...ys) + 6,
  };

  const out = { pose, coverage, zoom, pixels, emb, embPe, attn, probs, ff1, ff2, outline, bbox };
  if (cache.size > 6) cache.clear();
  cache.set(loop, out);
  return out;
}

/* Drawing ---------------------------------------------------------------- */
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const ease = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const fmt = (v: number) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(2);

export function drawVit(ctx: CanvasRenderingContext2D, t: number, p: Palette, mono: string, s: number) {
  const loop = Math.floor(t / LOOP);
  const lt = t - loop * LOOP;
  const R = run(loop);
  let si = ORDER.length - 1;
  while (lt < T[ORDER[si]]) si--;
  const stage = ORDER[si];
  const next = si < ORDER.length - 1 ? T[ORDER[si + 1]] : LOOP;
  const sp = (lt - T[stage]) / (next - T[stage]);
  const reached = (st: Stage) => ORDER.indexOf(st) <= si;
  const on = (st: Stage) => stage === st;
  const prog = (st: Stage) => (!reached(st) ? 0 : on(st) ? sp : 1);
  const tail = 1 - ease((lt - (LOOP - 700)) / 700); // fade before the next loop
  const hair = 1 / s;
  const accent = p.box;
  const grey = p.muted;
  const quiet = p.line;

  const text = (str: string, x: number, y: number, o: { size?: number; align?: CanvasTextAlign; colour?: string; alpha?: number; weight?: number } = {}) => {
    ctx.font = `${o.weight ?? 500} ${o.size ?? 9}px ${mono}`;
    ctx.textAlign = o.align ?? "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = o.colour ?? grey;
    ctx.globalAlpha = o.alpha ?? 0.62;
    ctx.fillText(str, x, y);
  };
  const label = (str: string, x: number, y: number, active: boolean, align: CanvasTextAlign = "center", size = 9.5) =>
    text(str, x, y, { size, align, colour: active ? accent : grey, alpha: active ? 1 : 0.62 });
  const stroke = (active: boolean, alpha = 0.5) => {
    ctx.globalAlpha = active ? 0.95 : alpha;
    ctx.strokeStyle = active ? accent : quiet;
    ctx.lineWidth = hair;
  };
  const line = (x0: number, y0: number, x1: number, y1: number, active: boolean, dash?: number[]) => {
    stroke(active);
    ctx.setLineDash(dash ?? []);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const arrow = (x: number, y: number, active: boolean) => {
    ctx.globalAlpha = active ? 0.9 : 0.5;
    ctx.fillStyle = active ? accent : quiet;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2.5, y + 4);
    ctx.lineTo(x + 2.5, y + 4);
    ctx.closePath();
    ctx.fill();
  };
  const box = (b: { y: number; h: number }, str: string, active: boolean) => {
    ctx.globalAlpha = active ? 0.95 : 0.55;
    ctx.strokeStyle = active ? accent : grey;
    ctx.lineWidth = hair;
    roundRect(ctx, CX - TW / 2, b.y, TW, b.h, 2);
    ctx.stroke();
    label(str, CX, b.y + b.h / 2 + 0.5, active);
  };
  const patchXY = (k: number) => ({ x: IMG.x + (k % G) * PS, y: IMG.y + Math.floor(k / G) * PS });
  const tokXY = (k: number) => ({ x: TOK.x + k * TOK.w, y: TOK.y }); // k = 0 is [CLS]

  /* ---- image: the pen, the drinker, the feeder and the pig ---- */
  {
    const active = on("image");
    ctx.globalAlpha = active ? 0.9 : 0.55;
    ctx.strokeStyle = active ? accent : grey;
    ctx.lineWidth = hair * 1.5;
    ctx.strokeRect(IMG.x, IMG.y, IMG.s, IMG.s);
    // feeder trough and drinker nipple on the walls
    ctx.lineWidth = hair;
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = grey;
    roundRect(ctx, FEEDER.x, FEEDER.y, FEEDER.w, FEEDER.h, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(FEEDER.x + 4, FEEDER.y + FEEDER.h / 2);
    ctx.lineTo(FEEDER.x + FEEDER.w - 4, FEEDER.y + FEEDER.h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(DRINKER.x, DRINKER.y, DRINKER.r, 0, Math.PI * 2);
    ctx.moveTo(DRINKER.x + DRINKER.r, DRINKER.y);
    ctx.lineTo(IMG.x + IMG.s, DRINKER.y);
    ctx.stroke();
    // straw: a few short strokes on the floor
    const sr = rng(12);
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 26; i++) {
      const x = IMG.x + 8 + sr() * (IMG.s - 16);
      const y = IMG.y + 8 + sr() * (IMG.s - 30);
      const a = sr() * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
      ctx.stroke();
    }
    const appear = on("image") ? ease(sp * 1.6) : 1;
    drawPig(ctx, R.pose, p, hair, 0.85 * appear * tail);
  }

  /* ---- patch grid ---- */
  {
    const k = prog("grid");
    if (k > 0) {
      stroke(on("grid"), 0.32);
      ctx.globalAlpha *= tail;
      ctx.beginPath();
      for (let i = 1; i < G; i++) {
        const d = ease(k * 1.4 - (i - 1) * 0.15);
        ctx.moveTo(IMG.x + i * PS, IMG.y);
        ctx.lineTo(IMG.x + i * PS, IMG.y + IMG.s * d);
        ctx.moveTo(IMG.x, IMG.y + i * PS);
        ctx.lineTo(IMG.x + IMG.s * d, IMG.y + i * PS);
      }
      ctx.stroke();
    }
  }

  /* ---- zoom into one patch, then flatten its pixels into a row ---- */
  if (reached("zoom")) {
    const active = on("zoom") || on("flatten");
    const z = patchXY(R.zoom);
    const shown = on("zoom") ? ease(sp * 2) : 1;
    const keep = active ? 1 : 0.45;
    // the patch, and leader lines to the enlarged view
    ctx.globalAlpha = (active ? 0.95 : 0.4) * tail;
    ctx.strokeStyle = active ? accent : grey;
    ctx.lineWidth = hair * 1.25;
    ctx.strokeRect(z.x, z.y, PS, PS);
    stroke(active, 0.25);
    ctx.globalAlpha *= shown * tail;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(z.x, z.y);
    ctx.lineTo(CALL.x, CALL.y + CALL.ch * 4);
    ctx.moveTo(z.x + PS, z.y);
    ctx.lineTo(CALL.x + CALL.cw * 4, CALL.y + CALL.ch * 4);
    ctx.stroke();
    ctx.setLineDash([]);
    // enlarged pixels: grey squares with their values
    const flat = prog("flatten");
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const v = R.pixels[r][c];
        const i = r * 4 + c;
        const gx = CALL.x + c * CALL.cw;
        const gy = CALL.y + r * CALL.ch;
        ctx.globalAlpha = 0.5 * shown * keep * tail;
        ctx.fillStyle = `rgb(${v} ${v} ${v} / 0.28)`;
        ctx.fillRect(gx + 0.5, gy + 0.5, CALL.cw - 1, CALL.ch - 1);
        ctx.strokeStyle = active ? accent : grey;
        ctx.lineWidth = hair;
        ctx.globalAlpha = 0.35 * shown * keep * tail;
        ctx.strokeRect(gx, gy, CALL.cw, CALL.ch);
        // values travel from the grid into a single row
        const k = ease(flat * 1.5 - i * 0.03);
        const fx = FLAT.x + i * FLAT.step + 6;
        const tx = i < 8 ? gx + CALL.cw / 2 + (fx - gx - CALL.cw / 2) * k : gx + CALL.cw / 2;
        const ty = i < 8 ? gy + CALL.ch / 2 + (FLAT.y - gy - CALL.ch / 2) * k : gy + CALL.ch / 2;
        text(String(v), tx, ty, { size: 7.5, weight: 400, colour: p.ink, alpha: 0.85 * shown * keep * tail });
        if (i < 8 && k > 0.95) text(String(v), gx + CALL.cw / 2, gy + CALL.ch / 2, { size: 8, weight: 400, colour: p.ink, alpha: 0.4 * keep * tail });
      }
    if (flat > 0.6) {
      text("…", FLAT.x + 8 * FLAT.step + 4, FLAT.y, { size: 9, colour: p.ink, alpha: 0.7 * keep * tail });
      stroke(active, 0.3);
      ctx.globalAlpha *= tail;
      ctx.strokeRect(FLAT.x - 1, FLAT.y - 7, 8 * FLAT.step + 12, 14);
    }
  }

  /* ---- patches become a token sequence, [CLS] in front ---- */
  {
    const k = prog("tokens");
    const active = on("tokens");
    if (k > 0) {
      for (let i = 0; i < G * G; i++) {
        const a = patchXY(i);
        const b = tokXY(i + 1);
        const u = ease(k * 1.6 - i * 0.04);
        // flying copies of the patches while they travel
        if (on("tokens") && u > 0 && u < 1) {
          const size = PS + (TOK.h - PS) * u;
          ctx.globalAlpha = 0.6 * tail;
          ctx.strokeStyle = accent;
          ctx.lineWidth = hair;
          ctx.strokeRect(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, size, size);
        }
      }
      // the sequence itself
      for (let i = 0; i <= G * G; i++) {
        const b = tokXY(i);
        const arrived = i === 0 ? ease(k * 2) : ease(k * 1.6 - (i - 1) * 0.04) >= 1 ? 1 : 0;
        if (!arrived) continue;
        ctx.globalAlpha = (active ? 0.95 : 0.55) * arrived * tail;
        ctx.strokeStyle = i === 0 ? accent : active ? accent : grey;
        ctx.lineWidth = hair;
        ctx.strokeRect(b.x + 0.5, b.y, TOK.w - 1.5, TOK.h);
        if (i === 0) {
          ctx.globalAlpha = 0.35 * tail;
          ctx.fillStyle = accent;
          ctx.fillRect(b.x + 0.5, b.y, TOK.w - 1.5, TOK.h);
        }
      }
    }
  }

  /* ---- Patch + Position Embedding: a row of values per token ---- */
  {
    const active = on("embed");
    const k = prog("embed");
    const showPe = k > 0.55;
    const m = showPe ? R.embPe : R.emb;
    line(CX, TOK.y, CX, PLUS.y + 7, active);
    stroke(active, 0.45);
    ctx.globalAlpha *= tail;
    ctx.strokeRect(MAT.x, MAT.y, MAT.cw * 4, MAT.ch * 5);
    ["[CLS]", "p1", "p2", "p3"].forEach((name, r) =>
      text(name, MAT.x - 4, MAT.y + MAT.ch * (r + 0.5) + 0.5, { size: 8, align: "right", colour: r === 0 ? accent : grey, alpha: (r === 0 ? 0.8 : 0.55) * tail }),
    );
    if (k > 0) {
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          const a = active ? ease(k * 3 - r * 0.35) : 1;
          text(fmt(m[r][c]), MAT.x + MAT.cw * (c + 0.5), MAT.y + MAT.ch * (r + 0.5) + 0.5, { size: 8, weight: 400, colour: p.ink, alpha: 0.82 * a * tail });
        }
      text("⋮", MAT.x + MAT.cw * 2, MAT.y + MAT.ch * 4.5, { size: 9, colour: p.ink, alpha: 0.5 * tail });
    }
    label("Patch + Position", MAT.x + MAT.cw * 4 + 8, MAT.y + MAT.ch * 2, active, "left", 8.5);
    label("Embedding", MAT.x + MAT.cw * 4 + 8, MAT.y + MAT.ch * 3, active, "left", 8.5);
    // ⊕ with the sinusoidal encoding beside it
    stroke(active, 0.55);
    ctx.strokeStyle = active ? accent : grey;
    ctx.beginPath();
    ctx.arc(PLUS.x, PLUS.y, 7, 0, Math.PI * 2);
    ctx.moveTo(PLUS.x - 4, PLUS.y);
    ctx.lineTo(PLUS.x + 4, PLUS.y);
    ctx.moveTo(PLUS.x, PLUS.y - 4);
    ctx.lineTo(PLUS.x, PLUS.y + 4);
    ctx.stroke();
    ctx.beginPath();
    for (let u = 0; u <= 1; u += 0.02) {
      const x = PLUS.x + 16 + u * 32;
      const y = PLUS.y - Math.sin(u * Math.PI * 3) * 5;
      if (u === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    line(PLUS.x + 7, PLUS.y, PLUS.x + 16, PLUS.y, active);
  }

  /* ---- encoder block (unchanged structure), ×N ---- */
  line(CX, PLUS.y - 7, CX, SPLIT_Y, on("qkv"));
  line(CX, BOX.mha.y, CX, BOX.add1.y + BOX.add1.h, on("add1"));
  arrow(CX, BOX.add1.y + BOX.add1.h, on("add1"));
  line(CX, BOX.add1.y, CX, BOX.ff.y + BOX.ff.h, on("ff"));
  arrow(CX, BOX.ff.y + BOX.ff.h, on("ff"));
  line(CX, BOX.ff.y, CX, BOX.add2.y + BOX.add2.h, on("add2"));
  arrow(CX, BOX.add2.y + BOX.add2.h, on("add2"));
  line(CX, BOX.add2.y, CX, BOX.softmax.y + BOX.softmax.h, on("out"));
  arrow(CX, BOX.softmax.y + BOX.softmax.h, on("out"));
  [-32, 0, 32].forEach((dx, i) => {
    const a = on("qkv");
    line(CX, SPLIT_Y, CX + dx, BOX.mha.y + BOX.mha.h + 4, a);
    arrow(CX + dx, BOX.mha.y + BOX.mha.h, a);
    label(["Q", "K", "V"][i], CX + dx + (dx <= 0 ? -7 : 7), SPLIT_Y - 9, a, "center", 8.5);
  });
  const residual = (from: number, to: number, active: boolean) => {
    const x = CX - TW / 2;
    stroke(active, 0.45);
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
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = grey;
  ctx.lineWidth = hair;
  roundRect(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, 6);
  ctx.stroke();
  label("N×", FRAME.x - 10, FRAME.y + FRAME.h / 2, false, "right", 9);
  box(BOX.mha, "Multi-Head Attention", on("attn"));
  box(BOX.add1, "Add & Norm", on("add1"));
  box(BOX.ff, "Feed Forward", on("ff"));
  box(BOX.add2, "Add & Norm", on("add2"));
  box(BOX.softmax, "softmax", on("out"));

  /* ---- [CLS] attention over the patches, as the 4×4 grid ---- */
  {
    const active = on("attn") || on("project");
    line(CX + TW / 2, BOX.mha.y + BOX.mha.h / 2, HEAT.x - 4, BOX.mha.y + BOX.mha.h / 2, on("attn"), [2, 2]);
    stroke(active, 0.45);
    ctx.globalAlpha *= tail;
    ctx.strokeRect(HEAT.x, HEAT.y, HEAT.cw * G, HEAT.ch * G);
    const k = prog("attn");
    const maxA = Math.max(...R.attn);
    for (let i = 0; i < G * G; i++) {
      const fill = on("attn") ? ease(k * G - Math.floor(i / G)) : k > 0 ? 1 : 0;
      if (fill <= 0) continue;
      const v = R.attn[i];
      const x = HEAT.x + (i % G) * HEAT.cw;
      const y = HEAT.y + Math.floor(i / G) * HEAT.ch;
      ctx.globalAlpha = (0.06 + 0.75 * (v / maxA)) * fill * tail;
      ctx.fillStyle = accent;
      ctx.fillRect(x + 0.5, y + 0.5, HEAT.cw - 1, HEAT.ch - 1);
      text(v.toFixed(2), x + HEAT.cw / 2, y + HEAT.ch / 2 + 0.5, { size: 7.5, weight: 400, colour: p.ink, alpha: 0.9 * fill * tail });
    }
    // projected back onto the image: patches round the pig brighten
    const pk = prog("project");
    if (pk > 0) {
      const fade = on("project") ? ease(sp * 2) : reached("out") ? 0.35 : 1;
      for (let i = 0; i < G * G; i++) {
        const a = patchXY(i);
        ctx.globalAlpha = (0.04 + 0.5 * (R.attn[i] / maxA)) * fade * tail;
        ctx.fillStyle = accent;
        ctx.fillRect(a.x + 0.5, a.y + 0.5, PS - 1, PS - 1);
      }
      if (on("project")) {
        line(HEAT.x, HEAT.y + HEAT.ch * G, IMG.x + IMG.s + 4, IMG.y + 6, true, [2, 2]);
      }
    }
  }

  /* ---- feed-forward neurons ---- */
  {
    const active = on("ff");
    const ys = (n: number, y0: number, y1: number) => Array.from({ length: n }, (_, i) => y0 + ((y1 - y0) * i) / (n - 1));
    const l1 = ys(6, FF_L1.y0, FF_L1.y1);
    const l2 = ys(4, FF_L2.y0, FF_L2.y1);
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
    const k1 = !reached("ff") ? 0 : active ? ease(sp * 2) : 1;
    const k2 = !reached("ff") ? 0 : active ? ease(sp * 2 - 1) : 1;
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
    l1.forEach((y, i) => neuron(FF_L1.x, y, k1 * R.ff1[i]));
    l2.forEach((y, i) => neuron(FF_L2.x, y, k2 * R.ff2[i]));
  }

  /* ---- output 1: behaviour from [CLS], softmax bars ---- */
  {
    const active = on("out");
    const k = prog("out");
    line(CX + TW / 2, BOX.softmax.y + BOX.softmax.h / 2, BARS.x - 52, BOX.softmax.y + BOX.softmax.h / 2, active, [2, 2]);
    line(BARS.x - 52, BOX.softmax.y + BOX.softmax.h / 2, BARS.x - 52, BARS.y + BARS.row * 1.5, active, [2, 2]);
    const top = R.probs.indexOf(Math.max(...R.probs));
    CLASSES.forEach((name, i) => {
      const y = BARS.y + i * BARS.row;
      const win = i === top && reached("detect");
      text(name, BARS.x - 5, y, { size: 8.5, align: "right", colour: win ? accent : grey, alpha: (win ? 1 : 0.62) * tail });
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = quiet;
      ctx.lineWidth = hair;
      ctx.beginPath();
      ctx.moveTo(BARS.x, y + 4.5);
      ctx.lineTo(BARS.x + BARS.max, y + 4.5);
      ctx.stroke();
      const w = R.probs[i] * BARS.max * ease(k * 1.3);
      if (w > 0) {
        ctx.globalAlpha = (active || win ? 0.85 : 0.5) * tail;
        ctx.fillStyle = active || win ? accent : grey;
        ctx.fillRect(BARS.x, y - 3.5, w, 7);
      }
      if (k > 0.5) text(R.probs[i].toFixed(2), BARS.x + BARS.max + 4, y, { size: 8, weight: 400, align: "left", colour: p.ink, alpha: 0.85 * ease((k - 0.5) * 2) * tail });
    });
  }

  /* ---- output 2: segmentation — tokens back on the grid, then the mask ---- */
  {
    const k = prog("out");
    if (k > 0) {
      for (let i = 0; i < G * G; i++) {
        const a = tokXY(i + 1);
        const b = patchXY(i);
        const u = ease(k * 1.8 - i * 0.03);
        if (on("out") && u < 1) {
          const size = TOK.h + (PS - TOK.h) * u;
          ctx.globalAlpha = 0.5 * tail;
          ctx.strokeStyle = accent;
          ctx.lineWidth = hair;
          ctx.strokeRect(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, size, size);
        }
      }
      const m = ease((k - 0.45) / 0.55);
      if (m > 0) {
        ctx.globalAlpha = 0.1 * m * tail;
        ctx.fillStyle = accent;
        ctx.beginPath();
        R.outline.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.95 * tail;
        ctx.strokeStyle = accent;
        ctx.lineWidth = hair * 1.25;
        ctx.beginPath();
        const n = Math.max(2, Math.round(R.outline.length * m));
        for (let i = 0; i <= n; i++) {
          const q = R.outline[i % R.outline.length];
          if (i) ctx.lineTo(q.x, q.y);
          else ctx.moveTo(q.x, q.y);
        }
        ctx.stroke();
      }
    }
  }

  /* ---- detection: a box and a label, as on the research cards ---- */
  {
    const k = prog("detect");
    if (k > 0) {
      const d = ease(on("detect") ? sp * 1.6 : 1);
      const b = R.bbox;
      const grow = 1 + 0.12 * (1 - d); // settles from slightly loose, like the cards
      const w = b.w * grow;
      const h = b.h * grow;
      const x = b.x + (b.w - w) / 2;
      const y = b.y + (b.h - h) / 2;
      ctx.globalAlpha = 0.95 * d * tail;
      ctx.strokeStyle = accent;
      ctx.lineWidth = hair * 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = accent;
      ctx.fillRect(x - 2.5, y + h - 2.5, 5, 5);
      ctx.fillRect(x + w - 2.5, y + h - 2.5, 5, 5);
      const top = R.probs.indexOf(Math.max(...R.probs));
      const str = `pig · ${CLASSES[top]}  ${R.probs[top].toFixed(2)}`;
      ctx.font = `500 8.5px ${mono}`;
      const tw = ctx.measureText(str).width + 8;
      const lx = Math.min(Math.max(x - 0.75, IMG.x), IMG.x + IMG.s - tw);
      ctx.fillRect(lx, y - 12, tw, 12);
      ctx.globalAlpha = d * tail;
      ctx.fillStyle = p.boxInk;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(str, lx + 4, y - 5.5);
    }
  }

  /* ---- the single highlight travelling up the main path ---- */
  const PATH: [Stage, number, number][] = [
    ["embed", TOK.y, PLUS.y],
    ["qkv", PLUS.y, SPLIT_Y],
    ["attn", SPLIT_Y, BOX.mha.y + BOX.mha.h / 2],
    ["add1", BOX.mha.y + BOX.mha.h / 2, BOX.add1.y + BOX.add1.h / 2],
    ["ff", BOX.add1.y + BOX.add1.h / 2, BOX.ff.y + BOX.ff.h / 2],
    ["add2", BOX.ff.y + BOX.ff.h / 2, BOX.add2.y + BOX.add2.h / 2],
    ["out", BOX.add2.y + BOX.add2.h / 2, BOX.softmax.y + BOX.softmax.h / 2],
  ];
  const seg = PATH.find(([st]) => st === stage);
  if (seg) {
    const y = seg[1] + (seg[2] - seg[1]) * ease(sp);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(CX, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The pig from above, as line art: body, head, ears, snout and tail;
 *  lying down it is wider, with its legs out to one side. */
function drawPig(ctx: CanvasRenderingContext2D, pose: Pose, p: Palette, hair: number, alpha: number) {
  if (alpha <= 0) return;
  const sh = shape(pose.lying);
  ctx.save();
  ctx.translate(pose.cx, pose.cy);
  ctx.rotate(pose.a);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = hair * 1.1;
  ctx.beginPath();
  ctx.ellipse(sh.body.cx, 0, sh.body.a, sh.body.b, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(sh.head.cx, 0, sh.head.a, sh.head.b, 0, 0, Math.PI * 2);
  ctx.stroke();
  // snout
  ctx.beginPath();
  ctx.ellipse(sh.head.cx + 9, 0, 2.2, 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  // ears
  ctx.beginPath();
  ctx.moveTo(sh.head.cx - 3, -6);
  ctx.lineTo(sh.head.cx - 9, -10);
  ctx.lineTo(sh.head.cx - 1, -9);
  ctx.moveTo(sh.head.cx - 3, 6);
  ctx.lineTo(sh.head.cx - 9, 10);
  ctx.lineTo(sh.head.cx - 1, 9);
  ctx.stroke();
  // tail
  ctx.beginPath();
  ctx.arc(-sh.body.a - 3, 0, 2.5, Math.PI * 0.2, Math.PI * 1.7);
  ctx.stroke();
  // spine line, and legs when lying on its side
  ctx.globalAlpha = alpha * 0.45;
  ctx.beginPath();
  ctx.moveTo(-sh.body.a + 6, 0);
  ctx.lineTo(sh.body.a - 6, 0);
  ctx.stroke();
  if (pose.lying) {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (const x of [-12, -6, 8, 14]) {
      ctx.moveTo(x, sh.body.b - 1);
      ctx.lineTo(x + 2, sh.body.b + 6);
    }
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
