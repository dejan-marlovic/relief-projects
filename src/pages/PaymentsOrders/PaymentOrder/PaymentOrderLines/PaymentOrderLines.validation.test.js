import {
  approvedTransactionOptions,
  validatePaymentOrderLine,
} from "./PaymentOrderLines";

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
      amount: "Amount must be a number > 0.",
    });
  });
});
