"use client";

import { useRef } from "react";
import { drawVit, LOOP, W0 } from "./viz/vitFigure";
import { useCanvas } from "./viz/useCanvas";

// The same vision transformer figure as the hero background, in the page
// flow below the intro, for single-column layouts (phones, narrow tablets),
// where there's no open space beside the text. Hidden by CSS on wider
// screens. Scaled to the available width.
export default function VitInline({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mono = useRef("");

  useCanvas(
    ref,
    ({ ctx, w, t, p }) => {
      if (!w) return;
      if (!mono.current && ref.current) {
        mono.current =
          getComputedStyle(ref.current).getPropertyValue("--font-m").trim() || "ui-monospace, monospace";
      }
      const s = w / W0;
      ctx.save();
      ctx.scale(s, s);
      drawVit(ctx, t, p, mono.current, s);
      ctx.restore();
    },
    LOOP - 1500,
  );

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
