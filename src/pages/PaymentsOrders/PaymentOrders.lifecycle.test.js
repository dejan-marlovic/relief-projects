import {
  canSubmitPaymentOrderLifecycle,
  paymentOrderLifecycleStatus,
} from "./PaymentOrders";

test("payment order lifecycle safely defaults to draft", () => {
  expect(paymentOrderLifecycleStatus({})).toBe("DRAFT");
  expect(paymentOrderLifecycleStatus({ lifecycleStatus: "SUBMITTED" })).toBe(
    "SUBMITTED",
  );
});

test("admin and finance can submit only unlocked draft or returned payment orders", () => {
  expect(canSubmitPaymentOrderLifecycle({ lifecycleStatus: "DRAFT" }, true)).toBe(true);
  expect(canSubmitPaymentOrderLifecycle({ lifecycleStatus: "RETURNED" }, true)).toBe(true);
  expect(canSubmitPaymentOrderLifecycle({ lifecycleStatus: "SUBMITTED" }, true)).toBe(false);
  expect(canSubmitPaymentOrderLifecycle({ lifecycleStatus: "APPROVED" }, true)).toBe(false);
  expect(canSubmitPaymentOrderLifecycle({ lifecycleStatus: "DRAFT", locked: true }, true)).toBe(false);
  expect(canSubmitPaymentOrderLifecycle({ lifecycleStatus: "DRAFT" }, false)).toBe(false);
});
