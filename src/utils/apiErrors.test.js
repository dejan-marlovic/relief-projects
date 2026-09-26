import { dependencyLabel, formatApiError, readApiError } from "./apiErrors";

test("formats structured dependency conflicts for users", () => {
  expect(
    formatApiError({
      message: "Budget cannot be deleted.",
      dependencies: { costDetails: 3, transactions: 1, signatures: 0 },
    }),
  ).toBe(
    "Budget cannot be deleted.\n\nActive dependencies:\nCost details: 3\nTransactions: 1",
  );
});

test("creates a readable fallback label for new dependency keys", () => {
  expect(dependencyLabel("historicalPaymentLines")).toBe(
    "Historical payment lines",
  );
});

test("reads JSON and preserves plain-text backend errors", async () => {
  const jsonResponse = { text: async () => JSON.stringify({ message: "Conflict" }) };
  const textResponse = { text: async () => "Gateway unavailable" };

  await expect(readApiError(jsonResponse, "Fallback")).resolves.toBe("Conflict");
  await expect(readApiError(textResponse, "Fallback")).resolves.toBe(
    "Gateway unavailable",
  );
});
