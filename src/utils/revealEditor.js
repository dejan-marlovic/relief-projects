export function revealEditor(element) {
  if (!element) return;
  const field = Array.from(element.querySelectorAll("input, textarea, select, button"))
    .find(control => !control.matches(":disabled, [type=hidden]") && !control.closest("[hidden]"));
  (field || element).focus({ preventScroll: true });
  const notice = element.ownerDocument.querySelector("[data-open-editor-notice]");
  element.style.scrollMarginTop = `${Math.ceil(notice?.getBoundingClientRect().height || 0) + 16}px`;
  element.scrollIntoView?.({
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
    block: "start",
  });
}

