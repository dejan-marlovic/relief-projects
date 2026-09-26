import React, { StrictMode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ImageZoomModal from "./ImageZoomModal";

const images = ["first.jpg", "second.jpg", "third.jpg"];
const props = { open: true, images, basePath: "/images/", index: 0 };

afterEach(() => { jest.restoreAllMocks(); });

test("opens a named native modal, focuses close, and restores focus and scrolling", () => {
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  opener.focus();
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "auto";
  const showModal = jest.spyOn(HTMLDialogElement.prototype, "showModal");
  const close = jest.spyOn(HTMLDialogElement.prototype, "close");
  const { rerender, container } = render(<ImageZoomModal {...props} captions={["Project visit"]} />);
  const dialog = screen.getByRole("dialog", { name: "Project image viewer" });
  expect(dialog.tagName).toBe("DIALOG");
  expect(dialog).toHaveAttribute("open");
  expect(dialog).toHaveAccessibleDescription("Project visit");
  expect(container).toBeEmptyDOMElement();
  expect(showModal).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Close zoom" })).toHaveFocus();
  expect(document.body.style.overflow).toBe("hidden");
  rerender(<ImageZoomModal {...props} open={false} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(close).toHaveBeenCalledTimes(1);
  expect(opener).toHaveFocus();
  expect(document.body.style.overflow).toBe("auto");
  opener.remove();
  document.body.style.overflow = previousOverflow;
});

test("Escape cancellation, close button and backdrop request close; content clicks do not", () => {
  const onClose = jest.fn();
  render(<ImageZoomModal {...props} onClose={onClose} />);
  const dialog = screen.getByRole("dialog");
  fireEvent.mouseDown(within(dialog).getAllByRole("img")[0]);
  expect(onClose).not.toHaveBeenCalled();
  const cancel = new Event("cancel", { cancelable: true });
  fireEvent(dialog, cancel);
  expect(cancel.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Close zoom" }));
  fireEvent.mouseDown(dialog);
  expect(onClose).toHaveBeenCalledTimes(3);
});

test("arrows wrap and use the current callback without resetting focus on image changes", () => {
  const firstChange = jest.fn();
  const nextChange = jest.fn();
  const { rerender } = render(<ImageZoomModal {...props} onChangeIndex={firstChange} />);
  const nextButton = screen.getByRole("button", { name: "Next image" });
  nextButton.focus();
  fireEvent.keyDown(nextButton, { key: "ArrowLeft" });
  expect(firstChange).toHaveBeenLastCalledWith(2);
  rerender(<ImageZoomModal {...props} index={2} onChangeIndex={nextChange} />);
  expect(nextButton).toHaveFocus();
  fireEvent.keyDown(nextButton, { key: "ArrowRight" });
  expect(nextChange).toHaveBeenLastCalledWith(0);
  fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
  expect(nextChange).toHaveBeenLastCalledWith(1);
  fireEvent.click(screen.getByRole("button", { name: "Open image 2" }));
  expect(nextChange).toHaveBeenLastCalledWith(1);
  expect(screen.getByRole("button", { name: "Open image 3" })).toHaveAttribute("aria-current", "true");
  expect(screen.getByRole("button", { name: "Open image 1" })).not.toHaveAttribute("aria-current");
  nextChange.mockClear();
  fireEvent.keyDown(nextButton, { key: "ArrowRight", altKey: true });
  fireEvent.keyDown(window, { key: "ArrowRight" });
  expect(nextChange).not.toHaveBeenCalled();
});

test("single and empty galleries have no navigation and never emit an empty image URL", () => {
  const onChangeIndex = jest.fn();
  const { rerender } = render(<ImageZoomModal {...props} images={["only.jpg"]} index={99} onChangeIndex={onChangeIndex} />);
  expect(screen.getByRole("img")).toHaveAttribute("src", "/images/only.jpg");
  expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
  expect(onChangeIndex).not.toHaveBeenCalled();
  rerender(<ImageZoomModal {...props} images={[]} />);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText("No image available.")).toBeInTheDocument();
});

test("Strict Mode cleanup supports reopening and unmounting after the opener is removed", () => {
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  opener.focus();
  const overflow = document.body.style.overflow;
  const { rerender, unmount } = render(<StrictMode><ImageZoomModal {...props} /></StrictMode>);
  expect(screen.getByRole("dialog")).toHaveAttribute("open");
  expect(screen.getByRole("button", { name: "Close zoom" })).toHaveFocus();
  rerender(<StrictMode><ImageZoomModal {...props} open={false} /></StrictMode>);
  expect(opener).toHaveFocus();
  rerender(<StrictMode><ImageZoomModal {...props} /></StrictMode>);
  opener.remove();
  unmount();
  expect(document.body.style.overflow).toBe(overflow);
});
