const pendingReveals = new WeakMap();

export function revealEditor(element) {
  if (!element) return;
  pendingReveals.get(element)?.();
  const field = Array.from(element.querySelectorAll("input, textarea, select, button"))
    .find(control => !control.matches(":disabled, [type=hidden]") && !control.closest("[hidden]"));
  (field || element).focus({ preventScroll: true });
  // Registration adds the editor notice in a separate React commit. Wait for
  // that layout to paint before measuring it and starting smooth scrolling.
  let frame;
  const cancel = () => { cancelAnimationFrame(frame); pendingReveals.delete(element); };
  pendingReveals.set(element, cancel);
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      pendingReveals.delete(element);
      if (!element.isConnected) return;
      const notice = element.ownerDocument.querySelector("[data-open-editor-notice]");
      element.style.scrollMarginTop = `${Math.ceil(notice?.getBoundingClientRect().height || 0) + 16}px`;
      element.scrollIntoView?.({
        // Newly opened forms also insert notices and disabled-action hints.
        // Avoid an animated scroll that browser anchoring can interrupt as
        // those controls settle. Record navigation can still scroll smoothly.
        behavior: element.matches("form") || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
        block: "start",
      });
    });
  });
  return cancel;
}

