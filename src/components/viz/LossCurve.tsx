import { rng } from "./math";
import styles from "./figures.module.css";

const W = 1000;
const H = 30;

// Scroll progress drawn as a training-loss curve along the bottom edge of
// the screen: it reveals left to right as the page scrolls, falling steeply
// at first and then flattening with a little noise, as loss does.
// Scroll-driven CSS only; hidden where that isn't supported.
export default function LossCurve() {
  const rand = rng(5);
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 4) {
    const u = x / W;
    const loss = 0.08 + 0.86 * Math.exp(-u * 5.5) + (rand() - 0.5) * 0.05 * (1 - u * 0.6);
    pts.push(`${x},${(2 + (1 - loss) * (H - 4)).toFixed(1)}`);
  }
  return (
    <svg className={styles.loss} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`M${pts.join("L")}`} />
    </svg>
  );
}
