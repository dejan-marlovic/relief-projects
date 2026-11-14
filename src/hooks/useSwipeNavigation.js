import { useRef } from "react";

const controls = "input, textarea, select, button, a, [contenteditable]:not([contenteditable=false]), [role=slider], [role=dialog], [data-no-swipe], .recharts-wrapper, canvas, video";
function excluded(target, root) {
  if (target instanceof Element && target.closest("[data-swipe-scope]") && target.closest("[data-swipe-scope]") !== root) return true;
  if (!(target instanceof Element) || target.closest(controls)) return true;
  for (let node = target; node && node !== root; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 2 && /auto|scroll/.test(window.getComputedStyle(node).overflowX)) return true;
  }
  return root.scrollWidth > root.clientWidth + 2;
}

export default function useSwipeNavigation({ enabled, route, onSwipe }) {
  const gesture = useRef(null);
  return {
    onTouchStart(event) {
      gesture.current = null;
      if (!enabled || event.touches.length !== 1 || excluded(event.target, event.currentTarget) || window.getSelection()?.toString()) return;
      const touch = event.touches[0];
      // Leave browser edge gestures alone.
      if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
      gesture.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier, at: Date.now(), route };
    },
    onTouchMove(event) {
      const start = gesture.current;
      if (!start) return;
      const touch = event.touches[0];
      if (event.touches.length !== 1 || Math.abs(touch.clientY - start.y) > 30) gesture.current = null;
    },
    onTouchCancel() { gesture.current = null; },
    onTouchEnd(event) {
      const start = gesture.current;
      gesture.current = null;
      if (!enabled || !start || start.route !== route || event.touches.length || Date.now() - start.at > 800 || window.getSelection()?.toString()) return;
      const touch = Array.from(event.changedTouches).find(item => item.identifier === start.id);
      if (!touch) return;
      const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
      if (Math.abs(dx) >= 80 && Math.abs(dy) <= 30 && Math.abs(dx) > Math.abs(dy) * 3) onSwipe(dx < 0 ? 1 : -1);
    },
  };
}
