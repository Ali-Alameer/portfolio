"use client";

import { useEffect, useRef } from "react";

const nf = new Intl.NumberFormat("en-GB");

// Renders the final figure on the server, then counts up to it the first time
// it scrolls into view. Skipped when the visitor prefers reduced motion.
// The final figure stays in the flow (transparent) so the surrounding text
// never reflows while the digits change, and it is what screen readers get.
export default function CountUp({
  value,
  delay = 0,
  prefix = "",
}: {
  value: number;
  delay?: number;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = prefix + nf.format(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const duration = 1600;
    let raf = 0;
    let start = 0;
    el.textContent = prefix + "0";

    const tick = (t: number) => {
      if (!start) start = t + delay;
      const p = Math.min(Math.max((t - start) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + nf.format(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = prefix + nf.format(value);
    };
  }, [value, delay, prefix]);

  return (
    <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
      <span style={{ color: "transparent" }}>{final}</span>
      <span ref={ref} aria-hidden="true" style={{ position: "absolute", left: 0, top: 0 }}>
        {final}
      </span>
    </span>
  );
}
