"use client";

import { useEffect } from "react";

// Page-wide pointer behaviour, attached once:
//
// 1. Attention spotlight (desktop, pointer devices only): sets --mx/--my on
//    the [data-spot] section under the pointer so a faint saliency glow can
//    follow it over the background grid.
//
// 2. Linked highlighting: inside a [data-link-scope], pointing at (or
//    focusing, or tapping) an element with [data-link-trigger] marks every
//    element sharing its data-link key as [data-hot] and the scope as
//    [data-linking], so CSS can bring those forward and quieten the rest.
export default function Interactions() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let spot: HTMLElement | null = null;
    let raf = 0;
    let last: PointerEvent | null = null;

    const moveSpot = () => {
      raf = 0;
      if (!last) return;
      const el = (last.target as Element | null)?.closest<HTMLElement>("[data-spot]") ?? null;
      if (spot && spot !== el) spot.removeAttribute("data-spot-on");
      spot = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${last.clientX - r.left}px`);
      el.style.setProperty("--my", `${last.clientY - r.top}px`);
      el.setAttribute("data-spot-on", "");
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      last = e;
      if (!raf) raf = requestAnimationFrame(moveSpot);
    };

    const onLeaveWindow = () => {
      spot?.removeAttribute("data-spot-on");
      spot = null;
    };

    let scope: HTMLElement | null = null;
    const clearLink = () => {
      if (!scope) return;
      scope.removeAttribute("data-linking");
      scope.querySelectorAll("[data-hot]").forEach((n) => n.removeAttribute("data-hot"));
      scope = null;
    };

    const link = (target: EventTarget | null) => {
      const trigger = (target as Element | null)?.closest<HTMLElement>("[data-link-trigger]");
      const nextScope = trigger?.closest<HTMLElement>("[data-link-scope]") ?? null;
      const key = trigger?.dataset.link;
      if (!trigger || !nextScope || !key) {
        clearLink();
        return;
      }
      if (scope === nextScope && trigger.hasAttribute("data-hot")) return;
      clearLink();
      scope = nextScope;
      scope.setAttribute("data-linking", "");
      scope.querySelectorAll<HTMLElement>("[data-link]").forEach((n) => {
        if (n.dataset.link === key) n.setAttribute("data-hot", "");
      });
    };

    const onOver = (e: PointerEvent) => link(e.target);
    const onFocus = (e: FocusEvent) => link(e.target);

    if (finePointer && !reduced) {
      document.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeaveWindow);
    }
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("focusin", onFocus);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);

  return null;
}
