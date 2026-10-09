import { rng } from "./math";
import styles from "./figures.module.css";

const W = 1440;
const H = 40;

// A thin signal trace across the top edge of a section: a quiet baseline
// with a few events (ECG-like complexes and short audio bursts). It draws
// itself in once when it scrolls into view. Server-rendered SVG.
export default function SignalTrace({ seed }: { seed: number }) {
  return (
    <svg
      className={styles.trace}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      data-inview
    >
      <path d={trace(seed)} pathLength={1} />
    </svg>
  );
}

function trace(seed: number) {
  const rand = rng(seed);
  const mid = H / 2;
  // a few event positions, kept apart
  const events = [0.12, 0.38, 0.63, 0.86].map((x) => (x + (rand() - 0.5) * 0.08) * W);
  const kinds = events.map(() => (rand() < 0.5 ? "ecg" : "burst"));
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 3) {
    let y = mid + (rand() - 0.5) * 1.2;
    events.forEach((ex, i) => {
      const d = x - ex;
      if (kinds[i] === "ecg") {
        // small P wave, sharp QRS, rounded T wave
        y += -2.5 * Math.exp(-((d + 26) ** 2) / 40);
        if (d > -6 && d < 0) y += (d + 6) * 1.2;
        if (d >= 0 && d < 4) y += -14 + d * 0.8;
        if (d >= 4 && d < 9) y += 10 - (d - 4) * 2;
        y += -4 * Math.exp(-((d - 30) ** 2) / 90);
      } else if (Math.abs(d) < 60) {
        const env = Math.cos((d / 60) * (Math.PI / 2)) ** 2;
        y += env * 9 * Math.sin(d * 0.9) * Math.sin(d * 0.23);
      }
    });
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}
