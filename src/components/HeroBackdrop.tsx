"use client";

import { useEffect, useRef } from "react";
import styles from "./HeroBackdrop.module.css";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* A slow drifting point network behind the hero. Now and then a detection
   box settles around one of the points, the same motif as the box on the
   name. */
type Node = { x: number; y: number; vx: number; vy: number; r: number };
type Box = { node: Node; born: number; size: number };

export default function HeroBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const still = reducedMotion();
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    let boxes: Box[] = [];
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let nextBox = last + 1500;

    const css = getComputedStyle(canvas);
    const accent = css.getPropertyValue("--net-accent").trim() || "#a3a6ff";
    const lineRGB = css.getPropertyValue("--net-line").trim() || "220, 226, 222";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, Math.max(28, (w * h) / 16000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.012,
        vy: (Math.random() - 0.5) * 0.012,
        r: 1 + Math.random() * 1.4,
      }));
      boxes = [];
      draw(last);
    };

    const link = Math.min(170, Math.max(110, window.innerWidth / 9));

    function draw(now: number) {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > link) continue;
          ctx.strokeStyle = `rgba(${lineRGB}, ${0.24 * (1 - d / link)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(${lineRGB}, 0.6)`;
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of boxes) drawBox(b, now);
    }

    // A box shrinks onto its point over ~1.2s, holds, then fades out.
    const LIFE = 5200;
    function drawBox(b: Box, now: number) {
      const t = (now - b.born) / LIFE;
      const settle = 1 - Math.pow(1 - Math.min(t / 0.25, 1), 3);
      const alpha = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
      const s = b.size * (1.6 - 0.6 * settle);
      const x = b.node.x - s / 2;
      const y = b.node.y - s / 2;
      const c = Math.min(10, s / 4);
      ctx.globalAlpha = Math.max(0, alpha) * 0.85;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // corner brackets only, as annotation tools draw them
      ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
      ctx.moveTo(x + s - c, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + c);
      ctx.moveTo(x + s, y + s - c); ctx.lineTo(x + s, y + s); ctx.lineTo(x + s - c, y + s);
      ctx.moveTo(x + c, y + s); ctx.lineTo(x, y + s); ctx.lineTo(x, y + s - c);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(b.node.x, b.node.y, b.node.r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function frame(now: number) {
      const dt = Math.min(now - last, 50);
      last = now;
      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }
      boxes = boxes.filter((b) => now - b.born < LIFE);
      // boxes only where there's open space to the right of the text
      if (w >= 832 && now > nextBox && boxes.length < 2) {
        const pool = nodes.filter((n) => n.x > w * 0.45 && n.y > 40 && n.y < h - 40);
        const node = pool[Math.floor(Math.random() * pool.length)];
        if (node) boxes.push({ node, born: now, size: 34 + Math.random() * 30 });
        nextBox = now + 2600 + Math.random() * 2400;
      }
      draw(now);
      if (visible) raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let io: IntersectionObserver | undefined;
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    if (!still) {
      io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        onVisibility();
      });
      io.observe(canvas);
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className={styles.backdrop} aria-hidden="true">
      <canvas ref={ref} className={styles.canvas} />
      <div className={styles.shade} />
    </div>
  );
}
