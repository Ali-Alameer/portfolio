"use client";

import { useRef } from "react";
import { drawVit, H0, LOOP, W0 } from "./viz/vitFigure";
import { useCanvas } from "./viz/useCanvas";
import styles from "./EmbeddingBackdrop.module.css";

// The hero's only animation: a vision transformer reading a ceiling-camera
// frame of a pig pen, from image to prediction (viz/vitFigure), placed in
// the open space at the upper right so the name and intro stay clear. Where
// the hero is a single column (phones, narrow tablets) it draws nothing
// here; VitInline shows it below the intro instead. Under reduced motion it
// shows the finished pass, still.
export default function VitBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mono = useRef("");

  useCanvas(
    ref,
    ({ ctx, w, h, t, p }) => {
      if (w < 832) return;
      // open space: right of the name (≈ 69% across) and above the citation
      // panel (≈ 45% down)
      const availW = w * (0.985 - 0.69);
      const availH = h * (0.445 - 0.035);
      const s = Math.min(1, availW / W0, availH / H0);
      if (s < 0.7) return;
      if (!mono.current && ref.current) {
        mono.current =
          getComputedStyle(ref.current).getPropertyValue("--font-m").trim() || "ui-monospace, monospace";
      }
      ctx.save();
      ctx.translate(w * 0.985 - W0 * s, h * 0.035);
      ctx.scale(s, s);
      drawVit(ctx, t, p, mono.current, s);
      ctx.restore();
    },
    // still frame: the pass just completed, with every stage filled in
    LOOP - 1500,
  );

  return (
    <div className={styles.backdrop} aria-hidden="true">
      <canvas ref={ref} className={styles.canvas} />
      <div className={styles.shade} />
    </div>
  );
}
