"use client";

import { useSyncExternalStore } from "react";
import styles from "./ThemeToggle.module.css";

type Choice = "system" | "light" | "dark";
const order: Choice[] = ["system", "light", "dark"];
const EVENT = "themechange";

function read(): Choice {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" || t === "dark" ? t : "system";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export default function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, read, () => "system" as Choice);

  function next() {
    const n = order[(order.indexOf(choice) + 1) % order.length];
    const root = document.documentElement;
    try {
      if (n === "system") {
        root.removeAttribute("data-theme");
        localStorage.removeItem("theme");
      } else {
        root.setAttribute("data-theme", n);
        localStorage.setItem("theme", n);
      }
    } catch {
      // Storage can be unavailable; the attribute change still applies.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={next}
      aria-label={`Colour theme: ${choice}. Switch theme`}
    >
      <span className={styles.dot} data-choice={choice} aria-hidden="true" />
      {choice === "system" ? "Auto" : choice === "light" ? "Light" : "Dark"}
    </button>
  );
}
