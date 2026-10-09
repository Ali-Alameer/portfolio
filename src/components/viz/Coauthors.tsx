"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { publications, themes, type ThemeId } from "@/data/profile";
import styles from "./coauthors.module.css";

const ME = "A Alameer";
const W = 720;
const H = 400;
const CX = W / 2;
const CY = H / 2;

type Person = { name: string; papers: number; theme: ThemeId; x: number; y: number; r: number };

// Co-author network built from the publication list: me at the centre, each
// co-author on a ring (closer = more shared papers, larger = more shared
// papers), grouped into sectors by the strand most of those papers sit in.
// Only names already on the site are used, and only on hover or tap.
// Names that differ only by middle initial (J / JA Chambers) are merged.
export default function Coauthors() {
  const { people, pairs } = useMemo(() => build(), []);
  const [hot, setHot] = useState<number | null>(null);
  const linked = useMemo(() => {
    if (hot === null) return new Set<number>();
    return new Set(pairs.filter(([a, b]) => a === hot || b === hot).map(([a, b]) => (a === hot ? b : a)));
  }, [hot, pairs]);
  const p = hot === null ? null : people[hot];

  return (
    <figure className={styles.figure} aria-hidden="true" data-inview>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} onPointerLeave={() => setHot(null)}>
        {/* polar guides, like a plot's gridlines */}
        {[70, 120, 170].map((r) => (
          <circle key={r} cx={CX} cy={CY} r={r} className={styles.ring} />
        ))}
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * Math.PI * 2;
          const r0 = i % 6 ? 186 : 182;
          return (
            <line
              key={i}
              x1={CX + Math.cos(a) * r0}
              y1={CY + Math.sin(a) * r0}
              x2={CX + Math.cos(a) * 190}
              y2={CY + Math.sin(a) * 190}
              className={styles.tick}
            />
          );
        })}

        {/* co-authors who share a paper with each other, shown for the hovered person */}
        {hot !== null &&
          pairs
            .filter(([a, b]) => a === hot || b === hot)
            .map(([a, b]) => (
              <line
                key={`${a}-${b}`}
                x1={people[a].x}
                y1={people[a].y}
                x2={people[b].x}
                y2={people[b].y}
                className={styles.pair}
              />
            ))}

        {people.map((q, i) => (
          <line
            key={q.name}
            x1={CX}
            y1={CY}
            x2={q.x}
            y2={q.y}
            className={styles.spoke}
            data-hot={hot === i || undefined}
            data-dim={(hot !== null && hot !== i && !linked.has(i)) || undefined}
            style={{ "--i": i } as CSSProperties}
          />
        ))}

        {people.map((q, i) => (
          <g
            key={q.name}
            className={styles.node}
            data-theme={q.theme}
            data-hot={hot === i || undefined}
            data-dim={(hot !== null && hot !== i && !linked.has(i)) || undefined}
            style={{ "--i": i } as CSSProperties}
            onPointerEnter={() => setHot(i)}
            onClick={() => setHot(hot === i ? null : i)}
          >
            <circle cx={q.x} cy={q.y} r={q.r + 7} className={styles.hit} />
            <circle cx={q.x} cy={q.y} r={q.r} className={styles.dot} />
          </g>
        ))}

        <circle cx={CX} cy={CY} r={7} className={styles.me} />
        <circle cx={CX} cy={CY} r={12} className={styles.meRing} />
      </svg>

      {p && (
        <span
          className={styles.label}
          style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` } as CSSProperties}
        >
          {p.name}
        </span>
      )}
    </figure>
  );
}

function build() {
  const key = (n: string) => {
    const parts = n.split(" ");
    return `${parts[parts.length - 1]}|${parts[0][0]}`;
  };
  type Acc = { names: string[]; papers: number; themes: Record<string, number> };
  const acc = new Map<string, Acc>();
  const papersOf: string[][] = [];

  for (const pub of publications) {
    const names = pub.authors
      .split(", ")
      .map((n) => n.trim())
      .filter((n) => n && n !== "et al." && n !== ME);
    const keys: string[] = [];
    for (const n of names) {
      const k = key(n);
      const a = acc.get(k) ?? { names: [], papers: 0, themes: {} };
      if (!a.names.includes(n)) a.names.push(n);
      a.papers += 1;
      a.themes[pub.theme] = (a.themes[pub.theme] ?? 0) + 1;
      acc.set(k, a);
      keys.push(k);
    }
    papersOf.push(keys);
  }

  // order: by strand (in the site's strand order), then most papers first
  const order = themes.map((t) => t.id);
  const list = [...acc.entries()].map(([k, a]) => {
    const theme = order.reduce((best, t) => ((a.themes[t] ?? 0) > (a.themes[best] ?? 0) ? t : best), order[0]);
    // show the fullest written form of the name, e.g. "JA Chambers"
    const name = a.names.reduce((x, y) => (y.length > x.length ? y : x));
    return { k, name, papers: a.papers, theme };
  });
  list.sort((a, b) => order.indexOf(a.theme) - order.indexOf(b.theme) || b.papers - a.papers);

  const max = Math.max(...list.map((q) => q.papers));
  const gap = 0.12; // radians between strand sectors
  const usable = Math.PI * 2 - gap * order.length;
  let angle = -Math.PI / 2;
  let prevTheme = list[0]?.theme;
  const people: Person[] = list.map((q, i) => {
    if (q.theme !== prevTheme) {
      angle += gap;
      prevTheme = q.theme;
    }
    const a = angle + usable / list.length / 2;
    angle += usable / list.length;
    // frequent collaborators sit closer in; alternate rings so neighbours don't touch
    const closeness = Math.sqrt((q.papers - 1) / Math.max(1, max - 1));
    const r = 165 - 95 * closeness - (i % 2) * 14;
    return {
      name: q.name,
      papers: q.papers,
      theme: q.theme,
      x: CX + Math.cos(a) * r,
      y: CY + Math.sin(a) * r * 0.92,
      r: 2.4 + 2.3 * Math.sqrt(q.papers),
    };
  });

  const index = new Map(list.map((q, i) => [q.k, i]));
  const seen = new Set<string>();
  const pairs: [number, number][] = [];
  for (const keys of papersOf) {
    for (let x = 0; x < keys.length; x++)
      for (let y = x + 1; y < keys.length; y++) {
        const a = index.get(keys[x])!;
        const b = index.get(keys[y])!;
        const id = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!seen.has(id)) {
          seen.add(id);
          pairs.push([Math.min(a, b), Math.max(a, b)]);
        }
      }
  }
  return { people, pairs };
}
