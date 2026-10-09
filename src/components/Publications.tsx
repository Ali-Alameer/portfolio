"use client";

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { publications, themes, type Publication, type ThemeId } from "@/data/profile";
import styles from "./Publications.module.css";

type Filter = ThemeId | "all";
type Sort = "year" | "cited";

const nf = new Intl.NumberFormat("en-GB");

// The paper itself when Crossref gave us a DOI, otherwise a Scholar search.
function paperUrl(p: Publication) {
  return p.doi
    ? `https://doi.org/${p.doi}`
    : `https://scholar.google.com/scholar?q=${encodeURIComponent(`"${p.title}"`)}`;
}

// Journal article, conference paper or thesis, read from the venue. This
// matches the record types Crossref gives for every paper with a DOI.
type Kind = "journal" | "conference" | "thesis";
function paperKind(p: Publication): Kind {
  if (/thesis/i.test(p.venue)) return "thesis";
  if (/conference|INISTA/i.test(p.venue)) return "conference";
  return "journal";
}

// Minimal line icons for the three kinds; decorative only.
const KIND_PATHS: Record<Kind, string> = {
  // a page with a folded corner and lines of text
  journal: "M3 1.5h5.5L11 4v8.5H3z M8.5 1.5V4H11 M5 7h4 M5 9h4 M5 11h2.5",
  // a presentation screen on a stand
  conference: "M1.5 2h11v7h-11z M7 9v3 M4.5 12.5h5 M3.5 7l2-2 2 1.5 3-3",
  // a mortarboard
  thesis: "M1 5.2 7 2.2l6 3-6 3z M3.5 6.6v3c0 1.2 7 1.2 7 0v-3 M12.6 5.4v3.6",
};

function KindIcon({ kind }: { kind: Kind }) {
  return (
    <svg className={styles.kindIcon} viewBox="0 0 14 14" aria-hidden="true" data-kind={kind}>
      <path d={KIND_PATHS[kind]} />
    </svg>
  );
}

function Authors({ text }: { text: string }) {
  const parts = text.split(/(A Alameer)/);
  return (
    <>
      {parts.map((p, i) => (p === "A Alameer" ? <strong key={i}>{p}</strong> : p))}
    </>
  );
}

// Tells the section's citation network which paper is being pointed at, so
// its node and links can light up (CitationNetwork reads data-focus).
function focusNode(el: HTMLElement, i: number | null) {
  const section = el.closest<HTMLElement>("section");
  if (!section) return;
  if (i === null) delete section.dataset.focus;
  else section.dataset.focus = String(i);
}

export function SelectedPublications({ count = 5 }: { count?: number }) {
  const rows = [...publications].sort((a, b) => b.citations - a.citations).slice(0, count);
  const most = rows[0]?.citations || 1;

  return (
    <ol className={styles.cards}>
      {rows.map((p, i) => (
        <li
          key={p.title}
          className={styles.card}
          data-reg
          style={{ "--i": i } as CSSProperties}
          onPointerEnter={(e) => focusNode(e.currentTarget, i)}
          onPointerLeave={(e) => focusNode(e.currentTarget, null)}
          onFocus={(e) => focusNode(e.currentTarget, i)}
          onBlur={(e) => focusNode(e.currentTarget, null)}
        >
          <div className={styles.cardTop}>
            <span className={styles.year}>{p.year}</span>
            <span className={styles.cardCites} title="Google Scholar citations">
              {nf.format(p.citations)}
              <span className={styles.citesLabel}>cited</span>
            </span>
          </div>
          <h3 className={styles.cardTitle}>
            {/* the link covers the whole card; see .cardTitle a::after */}
            <a
              href={paperUrl(p)}
              target="_blank"
              rel="noreferrer"
            >
              {p.title}
            </a>
          </h3>
          <p className={styles.authors}>
            <Authors text={p.authors} />
          </p>
          <p className={styles.venue}>{p.venue}</p>
          {/* citations relative to the most cited paper */}
          <span
            className={styles.citeBar}
            aria-hidden="true"
            style={{ "--share": p.citations / most } as CSSProperties}
          />
          <span className={styles.corners} aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
}

export default function Publications() {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("year");

  const rows = useMemo(() => {
    const list = publications.filter((p) => filter === "all" || p.theme === filter);
    return [...list].sort((a, b) =>
      sort === "year" ? b.year - a.year || b.citations - a.citations : b.citations - a.citations,
    );
  }, [filter, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: publications.length };
    for (const p of publications) c[p.theme] = (c[p.theme] ?? 0) + 1;
    return c;
  }, []);

  // When the filter or sort changes, rows glide from their old positions to
  // their new ones (FLIP): measure before the update, then animate the
  // difference after React has re-rendered. Rows new to the view fade in.
  const listRef = useRef<HTMLOListElement>(null);
  const before = useRef<Map<string, number> | null>(null);

  const measure = () => {
    const m = new Map<string, number>();
    listRef.current
      ?.querySelectorAll<HTMLElement>("[data-key]")
      .forEach((el) => m.set(el.dataset.key!, el.getBoundingClientRect().top));
    return m;
  };

  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    listRef.current?.querySelectorAll<HTMLElement>("[data-key]").forEach((el) => {
      const old = prev.get(el.dataset.key!);
      if (old === undefined) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 450,
          delay: 200,
          easing: "ease-out",
          fill: "backwards",
        });
        return;
      }
      const dy = old - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], {
        duration: 700,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    });
  }, [rows]);

  const change = (update: () => void) => {
    before.current = measure();
    update();
  };

  // Changing the filter first blurs and fades the papers that are about to
  // leave, then rearranges the list.
  const pending = useRef(0);
  const pickFilter = (next: Filter) => {
    window.clearTimeout(pending.current);
    const leaving = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-key]") ?? [])].filter(
      (el) => next !== "all" && el.dataset.theme !== next,
    );
    if (!leaving.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      change(() => setFilter(next));
      return;
    }
    leaving.forEach((el) => el.setAttribute("data-leaving", ""));
    pending.current = window.setTimeout(() => {
      leaving.forEach((el) => el.removeAttribute("data-leaving"));
      change(() => setFilter(next));
    }, 260);
  };

  const options: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...themes.map((t) => ({ id: t.id, label: t.label })),
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <div className={styles.chips} role="group" aria-label="Filter by research theme">
          {options.map((o) => (
            <button
              key={o.id}
              id={`pub-filter-${o.id}`}
              type="button"
              className={styles.chip}
              aria-pressed={filter === o.id}
              onClick={() => pickFilter(o.id)}
            >
              {o.label}
              <span className={styles.count}>{counts[o.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className={styles.sort} htmlFor="pub-sort">
          Sort by
          <select id="pub-sort" value={sort} onChange={(e) => {
              const v = e.target.value as Sort;
              change(() => setSort(v));
            }}>
            <option value="year">Newest first</option>
            <option value="cited">Most cited</option>
          </select>
        </label>
      </div>

      {/* a timeline runs down the left edge with a dot where each new year
          starts; pointing at a dot highlights that year's papers. Rows fade
          in on scroll ([data-stagger]) where supported */}
      <ol
        ref={listRef}
        className={`${styles.list} ${styles.animated} ${styles.timeline}`}
        data-stagger
        data-link-scope
      >
        {rows.map((p, i) => (
          <li
            key={p.title}
            data-key={p.title}
            data-theme={p.theme}
            data-link={`y${p.year}`}
            className={styles.row}
            style={{ "--i": Math.min(i, 12) } as CSSProperties}
          >
            {(i === 0 || rows[i - 1].year !== p.year) && (
              <span className={styles.dot} data-link={`y${p.year}`} data-link-trigger aria-hidden="true" />
            )}
            <span className={styles.year}>
              {p.year}
              <KindIcon kind={paperKind(p)} />
            </span>
            <div className={styles.main}>
              <h3 className={styles.title}>
                <a
                  href={paperUrl(p)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {p.title}
                </a>
              </h3>
              <p className={styles.authors}>
                <Authors text={p.authors} />
              </p>
              <p className={styles.venue}>{p.venue}</p>
            </div>
            <span className={styles.cites} title="Google Scholar citations">
              {p.citations > 0 ? nf.format(p.citations) : "–"}
              <span className={styles.citesLabel}>cited</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
