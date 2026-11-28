import { revealEditor } from "./revealEditor";

test("measures the newly mounted notice after layout and cancels stale reveals", () => {
  let frames = new Map(), next = 0;
  jest.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++next, callback); return next; });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(id => frames.delete(id));
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); };
  const form = document.createElement("form");
  form.innerHTML = '<input aria-label="Response" />';
  form.scrollIntoView = jest.fn();
  document.body.append(form);
  const notice = document.createElement("aside");
  notice.dataset.openEditorNotice = "";
  notice.getBoundingClientRect = () => ({ height: 84 });
  try {
    revealEditor(form);
    expect(form.scrollIntoView).not.toHaveBeenCalled();
    document.body.append(notice);
    flush();
    expect(form.scrollIntoView).not.toHaveBeenCalled();
    flush();
    expect(form.style.scrollMarginTop).toBe("100px");
    expect(form.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(form.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    const cancel = revealEditor(form);
    flush(); cancel(); flush();
    expect(form.scrollIntoView).toHaveBeenCalledTimes(1);
    revealEditor(form); form.remove(); flush(); flush();
    expect(form.scrollIntoView).toHaveBeenCalledTimes(1);
  } finally { form.remove(); notice.remove(); jest.restoreAllMocks(); }
});
