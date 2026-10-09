"use client";

import { useEffect } from "react";

// Marks [data-reveal], [data-scan] and [data-inview] blocks as shown once they
// scroll into view, and flags the nav link for the section currently on
// screen. Only [data-reveal] and [data-scan] start hidden, and only under
// html[data-js], so without JavaScript nothing is hidden. [data-inview] just
// triggers its own effects.
export default function Reveal() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLElement>("[data-reveal], [data-scan], [data-inview]");
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
