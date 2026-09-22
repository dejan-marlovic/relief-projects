import {
  approvedTransactionOptions,
  allocationCostDetailOptions,
  validatePaymentOrderLine,
  isLockedResponse,
} from "./PaymentOrderLines";

test("ownership and transaction conflicts do not mark the payment order Booked", () => {
  expect(isLockedResponse({ status: 409 }, { message: "Line ownership changed. Refresh and retry.", fieldErrors: { paymentOrderId: "Owner changed" } })).toBe(false);
  expect(isLockedResponse({ status: 409 }, { message: "Line mutations in an enclosing transaction require writable READ_COMMITTED isolation." })).toBe(false);
  expect(isLockedResponse({ status: 409 }, { message: "Payment order is Booked and locked." })).toBe(true);
});

const validLine = {
  paymentOrderId: 1,
  transactionId: 2,
  organizationId: 3,
  costDetailId: 4,
  amount: 125,
  memo: null,
};

describe("payment order line validation", () => {
  test("accepts a complete line", () => {
    expect(validatePaymentOrderLine(validLine)).toEqual({});
  });

  test("new relationships offer only approved transactions while preserving a historical selection", () => {
    const transactions = [
      { id: 1, lifecycleStatus: "DRAFT" },
      { id: 2, lifecycleStatus: "SUBMITTED" },
      { id: 3, lifecycleStatus: "APPROVED" },
    ];

    expect(
      approvedTransactionOptions(transactions).map((transaction) => transaction.id),
    ).toEqual([3]);
    expect(
      approvedTransactionOptions(transactions, 2).map(
        (transaction) => transaction.id,
      ),
    ).toEqual([2, 3]);
  });

  test("requires an explicit transaction", () => {
    expect(
      validatePaymentOrderLine({ ...validLine, transactionId: null }),
    ).toEqual({ transactionId: "Transaction is required." });
  });

  test("offers only positively allocated cost details and keeps a fallback label", () => {
    const options = allocationCostDetailOptions(
      [
        { costDetailId: 115, plannedAmount: 500 },
        { costDetailId: 116, plannedAmount: 0 },
        { costDetailId: 117, plannedAmount: -1 },
      ],
      [{ costDetailId: 115, costDescription: "test2" }],
    );

    expect(options).toEqual([
      { costDetailId: 115, costDescription: "test2" },
    ]);
    expect(
      allocationCostDetailOptions([{ costDetailId: 118, plannedAmount: 1 }]),
    ).toEqual([
      { costDetailId: 118, costDescription: "Cost detail 118" },
    ]);
  });

  test("requires a cost detail", () => {
    expect(
      validatePaymentOrderLine({ ...validLine, costDetailId: null }),
    ).toEqual({ costDetailId: "Cost detail is required." });
  });

  test("returns all missing-field errors together", () => {
    expect(
      validatePaymentOrderLine({
        ...validLine,
        transactionId: null,
        organizationId: null,
        costDetailId: null,
        amount: null,
      }),
    ).toEqual({
      transactionId: "Transaction is required.",
      organizationId: "Organization is required.",
      costDetailId: "Cost detail is required.",
      amount: "Amount must be positive with at most 6 meaningful decimal places.",
    });
  });
});
