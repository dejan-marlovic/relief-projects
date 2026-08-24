import { fireEvent, render, screen } from "@testing-library/react";

import ErrorBanner from "./ErrorBanner";

test("renders a multiline error and dismisses it", () => {
  const onDismiss = jest.fn();

  render(
    <ErrorBanner
      message={"Delete failed.\n\nActive dependencies:\nTransactions: 2"}
      onDismiss={onDismiss}
    />,
  );

  expect(screen.getByRole("alert")).toHaveTextContent("Delete failed.");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss error message" }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test("renders nothing without a message", () => {
  const { container } = render(<ErrorBanner message="" />);
  expect(container).toBeEmptyDOMElement();
});
