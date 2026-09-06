import { render, screen } from "@testing-library/react";
import ReturnReason from "./ReturnReason";

test("renders reasons as text, preserving content without creating markup", () => {
  const reason = "<script>alert('x')</script>\nCorrect amounts.";
  const { container } = render(<ReturnReason event={{ action: "RETURN", returnReason: reason }} />);
  expect(container.textContent).toContain(reason);
  expect(container.querySelector("script")).toBeNull();
});
test("historical returns have an explicit fallback; other actions have no reason", () => {
  const view = render(<ReturnReason event={{ action: "RETURN", returnReason: null }} />);
  expect(screen.getByText("No reason recorded.")).toBeInTheDocument();
  view.rerender(<ReturnReason event={{ action: "APPROVE" }} />);
  expect(screen.queryByText("Return reason")).not.toBeInTheDocument();
});
