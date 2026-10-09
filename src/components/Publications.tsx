"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { publications, themes, type ThemeId } from "@/data/profile";
import styles from "./Publications.module.css";

type Filter = ThemeId | "all";
type Sort = "year" | "cited";

const nf = new Intl.NumberFormat("en-GB");

function Authors({ text }: { text: string }) {
  const parts = text.split(/(A Alameer)/);
  return (
    <>
      {parts.map((p, i) => (p === "A Alameer" ? <strong key={i}>{p}</strong> : p))}
    </>
  );
}

export function SelectedPublications({ count = 5 }: { count?: number }) {
  const rows = [...publications].sort((a, b) => b.citations - a.citations).slice(0, count);

  return (
    <ol className={styles.cards}>
      {rows.map((p, i) => (
        <li key={p.title} className={styles.card} style={{ "--i": i } as CSSProperties}>
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
              href={`https://scholar.google.com/scholar?q=${encodeURIComponent(`"${p.title}"`)}`}
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
              onClick={() => setFilter(o.id)}
            >
              {o.label}
              <span className={styles.count}>{counts[o.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className={styles.sort} htmlFor="pub-sort">
          Sort by
          <select id="pub-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="year">Newest first</option>
            <option value="cited">Most cited</option>
          </select>
        </label>
      </div>

      {/* keyed on the view so a new filter or sort replays the row entrance */}
      <ol key={`${filter}-${sort}`} className={`${styles.list} ${styles.animated}`}>
        {rows.map((p, i) => (
          <li key={p.title} className={styles.row} style={{ "--i": Math.min(i, 12) } as CSSProperties}>
            <span className={styles.year}>{p.year}</span>
            <div className={styles.main}>
              <h3 className={styles.title}>
                <a
                  href={`https://scholar.google.com/scholar?q=${encodeURIComponent(`"${p.title}"`)}`}
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
