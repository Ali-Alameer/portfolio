"use client";

import { useRef } from "react";
import { rng, useCanvas, type Frame } from "./useCanvas";
import styles from "./viz.module.css";

const LAYERS = [4, 6, 6, 5, 3];
const PERIOD = 5200; // one forward pass every few seconds

// A small fully connected network; activity passes through it layer by
// layer, like a forward pass, with each unit brightening as the wave reaches it.
export default function ForwardPass() {
  const ref = useRef<HTMLCanvasElement>(null);
  useCanvas(ref, draw);
  return <canvas ref={ref} className={`${styles.canvas} ${styles.figure}`} aria-hidden="true" />;
}

// stable per-unit activation strengths
const rand = rng(23);
const STRENGTH = LAYERS.map((n) => Array.from({ length: n }, () => 0.35 + 0.65 * rand()));

function draw({ ctx, w, h, t, p }: Frame) {
  const x0 = w * 0.18;
  const x1 = w * 0.92;
  const nodes = LAYERS.map((n, l) =>
    Array.from({ length: n }, (_, i) => ({
      x: x0 + ((x1 - x0) * l) / (LAYERS.length - 1),
      y: h * (0.5 + (i - (n - 1) / 2) * Math.min(0.12, 0.7 / n)),
    })),
  );
  // the wave's position, in layers (0 … LAYERS.length), with a pause after
  const wave = ((t % PERIOD) / PERIOD) * (LAYERS.length + 1.5) - 0.5;

  ctx.lineWidth = 0.6;
  for (let l = 0; l < LAYERS.length - 1; l++) {
    for (const a of nodes[l]) {
      for (const b of nodes[l + 1]) {
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = p.muted;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    // pulses on this layer's edges while the wave crosses it
    const u = wave - l;
    if (u > 0 && u < 1) {
      ctx.fillStyle = p.box;
      nodes[l].forEach((a, i) => {
        if (STRENGTH[l][i] < 0.55) return;
        nodes[l + 1].forEach((b, j) => {
          if ((i + j) % 2) return;
          ctx.globalAlpha = 0.75 * Math.sin(u * Math.PI) * STRENGTH[l][i];
          ctx.beginPath();
          ctx.arc(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 1.4, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    }
  }

  nodes.forEach((layer, l) =>
    layer.forEach((n, i) => {
      const glow = Math.max(0, 1 - Math.abs(wave - l) * 1.4) * STRENGTH[l][i];
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = p.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      if (glow > 0) {
        ctx.globalAlpha = 0.85 * glow;
        ctx.fillStyle = p.box;
        ctx.fill();
      }
    }),
  );
  ctx.globalAlpha = 1;
}
