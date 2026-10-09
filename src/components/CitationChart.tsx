import type { CSSProperties } from "react";
import { scholarStats } from "@/data/profile";
import styles from "./CitationChart.module.css";

const W = 360;
const H = 132;
const TOP = 18; // room for the peak label
const BASE = 108; // bar baseline; year labels sit below
const GAP = 6;

export default function CitationChart() {
  const data = scholarStats.perYear;
  const max = Math.max(...data.map((d) => d.count));
  const slot = W / data.length;
  const barW = slot - GAP;
  const y = (v: number) => BASE - (v / max) * (BASE - TOP);
  const peak = data.find((d) => d.count === max)!;
  const last = data[data.length - 1];

  return (
    <figure className={styles.figure} data-inview>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label={`Citations per year, ${data[0].year} to ${last.year}. Peak of ${max} in ${peak.year}.`}
      >
        <line x1="0" x2={W} y1={BASE} y2={BASE} className={styles.axis} />
        {data.map((d, i) => {
          const x = i * slot + GAP / 2;
          const partial = d === last;
          return (
            <g key={d.year}>
              <rect
                x={x}
                y={y(d.count)}
                width={barW}
                height={BASE - y(d.count)}
                className={partial ? styles.partial : styles.bar}
                style={{ "--i": i } as CSSProperties}
              >
                <title>{`${d.year}: ${d.count} citations${partial ? " (year to date)" : ""}`}</title>
              </rect>
              <text x={x + barW / 2} y={BASE + 16} className={styles.year}>
                {`’${String(d.year).slice(2)}`}
              </text>
              {(d === peak || partial) && (
                <text x={x + barW / 2} y={y(d.count) - 5} className={styles.value}>
                  {d.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.caption}>
        Citations per year, Google Scholar. {last.year} is year to date ({scholarStats.asOf}).
      </figcaption>
      <p className={styles.updated}>Last updated: {scholarStats.lastUpdated}</p>
      <p className={styles.note}>
        Citation figures are taken directly from Google Scholar and may not add up exactly.
      </p>
    </figure>
  );
}
