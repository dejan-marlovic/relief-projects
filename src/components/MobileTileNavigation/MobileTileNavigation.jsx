import React, { useEffect, useRef, useState } from "react";
import useSwipeNavigation from "../../hooks/useSwipeNavigation";
import styles from "./MobileTileNavigation.module.scss";

// Cards remain mounted: moving between them never discards a form or its draft.
export default function MobileTileNavigation({ rootRef, route }) {
  const tiles = useRef([]);
  const current = useRef(0);
  const [position, setPosition] = useState({ index: 0, count: 0, title: "" });
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame;
    const update = () => {
      const visible = [...root.querySelectorAll("[data-mobile-tile]")].filter(el => !el.closest("[data-mobile-record-deck]") && !el.querySelector("[data-mobile-record-deck]") && el.getClientRects().length && !el.closest('[hidden], [aria-hidden="true"]'));
      tiles.current = visible;
      let index = 0, distance = Infinity;
      visible.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const d = rect.top <= 24 && rect.bottom > 24 ? 0 : Math.abs(rect.top - 24);
        if (d <= distance) { index = i; distance = d; }
      });
      current.current = index;
      const el = visible[index];
      const title = el?.getAttribute("data-mobile-tile") || el?.querySelector("h2,h3,h4,summary")?.textContent || "Card";
      setPosition(old => old.index === index && old.count === visible.length && old.title === title ? old : { index, count: visible.length, title });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "open", "style", "class"] });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    update();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule, true); window.removeEventListener("resize", schedule); };
  }, [rootRef, route]);
  const move = direction => {
    const next = tiles.current[current.current + direction];
    if (!next) return;
    current.current += direction;
    setPosition(old => ({ ...old, index: current.current, title: next.getAttribute("data-mobile-tile") || next.querySelector("h2,h3,h4,summary")?.textContent || "Card" }));
    next.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const handlers = useSwipeNavigation({ enabled: true, route, onSwipe: move });
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const entries = [["touchstart", handlers.onTouchStart], ["touchmove", handlers.onTouchMove], ["touchend", handlers.onTouchEnd], ["touchcancel", handlers.onTouchCancel]];
    entries.forEach(([name, fn]) => root.addEventListener(name, fn, { passive: true }));
    return () => entries.forEach(([name, fn]) => root.removeEventListener(name, fn));
  });
  if (position.count < 2) return null;
  return <nav className={styles.controls} aria-label="Card navigation">
    <button type="button" aria-label="Previous card" disabled={position.index === 0} onClick={() => move(-1)}>←</button>
    <span><strong>{position.title}</strong><small>Card {position.index + 1} of {position.count} · Swipe to browse</small></span>
    <button type="button" aria-label="Next card" disabled={position.index >= position.count - 1} onClick={() => move(1)}>→</button>
  </nav>;
}
