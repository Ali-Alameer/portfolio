"use client";

import { useEffect, useRef } from "react";

const nf = new Intl.NumberFormat("en-GB");

// Renders the final figure on the server, then counts up to it the first time
// it scrolls into view. Skipped when the visitor prefers reduced motion.
export default function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const duration = 1600;
    let raf = 0;
    let start = 0;
    el.textContent = "0";

    const tick = (t: number) => {
      if (!start) start = t + delay;
      const p = Math.min(Math.max((t - start) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = nf.format(Math.round(value * eased));
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
      el.textContent = nf.format(value);
    };
  }, [value, delay]);

  return <span ref={ref}>{nf.format(value)}</span>;
}
