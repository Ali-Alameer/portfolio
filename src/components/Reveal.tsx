"use client";

import { useEffect } from "react";

// Marks [data-reveal] blocks as shown once they scroll into view, and flags
// the nav link for the section currently on screen. The hidden starting state
// only applies under html[data-js], so without JavaScript nothing is hidden.
export default function Reveal() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-shown", "");
          reveal.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    blocks.forEach((b) => reveal.observe(b));

    const links = new Map<string, HTMLAnchorElement>();
    document.querySelectorAll<HTMLAnchorElement>('nav a[href^="#"]').forEach((a) => {
      links.set(a.getAttribute("href")!.slice(1), a);
    });
    const spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const a = links.get(e.target.id);
          if (!a) continue;
          if (e.isIntersecting) {
            links.forEach((l) => l.removeAttribute("aria-current"));
            a.setAttribute("aria-current", "true");
          } else if (a.hasAttribute("aria-current")) {
            a.removeAttribute("aria-current");
          }
        }
      },
      // a thin band across the upper middle of the viewport
      { rootMargin: "-35% 0px -60% 0px" },
    );
    links.forEach((_, id) => {
      const s = document.getElementById(id);
      if (s) spy.observe(s);
    });

    return () => {
      reveal.disconnect();
      spy.disconnect();
    };
  }, []);

  return null;
}
