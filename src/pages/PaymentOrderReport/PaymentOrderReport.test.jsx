import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PaymentOrderReport, { ReportContent, validReport } from "./PaymentOrderReport";
import { appFetch } from "../../utils/appFetch";
import { downloadDocument } from "../../utils/documentDownload";
jest.mock("../../utils/appFetch", () => ({ appFetch: jest.fn() }));
jest.mock("../../utils/documentDownload", () => ({ downloadDocument: jest.fn() }));
const report = {
  version: 1, paymentOrderId: 73, view: "CURRENT_STATE", observedAt: "2026-10-04T10:00:00Z",
  coverage: { metadataComplete: true, fileContentsChecked: false }, project: null,
  order: { id: 73, transactionId: null, description: "<script>alert('x')</script>", lifecycleStatus: "APPROVED", locked: true, deleted: false },
  commitments: { amount: "10000.000001", amountSummary: { status: "CONSISTENT", currency: { id: 3, name: "USD" }, issues: [] } },
  lines: [], recipients: [], signatures: [{ id: 4, employee: { id: 2, name: "Named signer" }, status: { id: 1, name: "Approved" }, signatureDate: "2026-10-04T12:00:00" }],
  payments: { entries: [{ id: 8, recipientId: 9, amount: "4000.123456", currency: { id: 3, name: "USD" }, status: "VOIDED", replacementPaymentId: 10 }], summary: { status: "PARTIALLY_PAID", paidTotal: "4000.000000", recipientCommitment: "6000.000000", recipientRemaining: "2000.000000", orderRemaining: "6000.000000", issues: [] }, denominationConfirmation: null },
  documents: [{ document: { documentId: 7, documentName: "Original evidence.pdf", rootDocumentId: 7, versionNumber: 1, isCurrent: false, hasNewerVersion: true, currentDocumentId: 42, downloadEligible: true }, associations: [{ entityType: "OUTGOING_PAYMENT", entityId: 8, status: "VOIDED" }] }], issues: [],
};
const response = (data, ok = true) => ({ ok, status: ok ? 200 : 422, text: async () => JSON.stringify(data) });
const mount = () => render(<MemoryRouter initialEntries={["/payment-orders/73/report"]}><Routes><Route path="/payment-orders/:id/report" element={<PaymentOrderReport />} /></Routes></MemoryRouter>);
test("distinguishes late evidence and ordinary approval-time uncertainty in the index", () => {
  const data = { ...report, documents: [{ ...report.documents[0], associations: [{ entityType: "PAYMENT_ORDER", entityId: 73 }, { entityType: "PAYMENT_ORDER_FINAL_EVIDENCE", entityId: 12, role: "COMBINED_PAYMENT_EVIDENCE", attachedBy: { userId: 9, username: "finance" } }] }] };
  render(<ReportContent data={data} onDownload={jest.fn()} />);
  expect(screen.getByText(/Ordinary supporting documents — approval-time inclusion not recorded/)).toBeInTheDocument();
  expect(screen.getByText(/Late payment evidence · Attachment #12/)).toHaveTextContent("Not part of the approval decision");
  expect(screen.getAllByRole("button", { name: "Download exact version #7" })).toHaveLength(1);
});
beforeEach(() => { jest.clearAllMocks(); localStorage.setItem("authToken", "test"); });
afterEach(() => localStorage.clear());
test("requires complete supported report for the requested order", () => {
  expect(validReport(report, 73)).toBeTruthy();
  expect(validReport(report, 74)).toBeFalsy();
  expect(validReport({ ...report, coverage: { metadataComplete: false } }, 73)).toBeFalsy();
  expect(validReport({ ...report, lines: null }, 73)).toBeFalsy();
});
test("renders exact amounts, unknowns, escaped text and separate payment meanings", () => {
  render(<ReportContent data={report} onDownload={jest.fn()} />);
  expect(screen.getByText(/10000\.000001/)).toBeInTheDocument();
  expect(screen.getByText(/4000\.123456/)).toBeInTheDocument();
  expect(screen.getByText("No header transaction")).toBeInTheDocument();
  expect(screen.getByText(report.order.description)).toBeInTheDocument();
  expect(screen.getByText(/Replaced by #10/)).toBeInTheDocument();
  expect(screen.getByText(/Order remaining is not authorization/)).toBeInTheDocument();
  expect(screen.getByText(/not verify a signature on this report/)).toBeInTheDocument();
});
test("loads one coherent endpoint and downloads exact historical version only on request", async () => {
  appFetch.mockResolvedValue(response(report)); downloadDocument.mockResolvedValue(); mount();
  fireEvent.click(await screen.findByText("Download exact version #7"));
  await waitFor(() => expect(downloadDocument).toHaveBeenCalledWith(7, expect.any(Function)));
  expect(appFetch).toHaveBeenCalledTimes(1);
  expect(appFetch.mock.calls[0][0]).toMatch(/payment-orders\/73\/documentation$/);
  expect(appFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer test");
});
test("limit errors prevent partial report and printing", async () => {
  appFetch.mockResolvedValue(response({ code: "DOCUMENTATION_LIMIT_EXCEEDED", message: "No partial report was generated." }, false)); mount();
  await screen.findByRole("alert");
  expect(screen.getByText("Print / Save as PDF")).toBeDisabled();
  expect(screen.queryByText("Order details")).not.toBeInTheDocument();
});
test("failed refresh removes prior report and protected download errors remain actionable", async () => {
  appFetch.mockResolvedValueOnce(response(report)); downloadDocument.mockRejectedValue(new Error("Document storage is temporarily unavailable.")); mount();
  fireEvent.click(await screen.findByText("Download exact version #7"));
  await screen.findByText("Document storage is temporarily unavailable.");
  appFetch.mockResolvedValueOnce(response({ message: "Refresh failed" }, false));
  fireEvent.click(screen.getByText("Refresh whole report"));
  await screen.findByText("Refresh failed");
  expect(screen.queryByText("Order details")).not.toBeInTheDocument();
});
test("unavailable versions cannot trigger downloads", () => {
  const blocked = { ...report, documents: [{ ...report.documents[0], document: { ...report.documents[0].document, downloadEligible: false } }] };
  render(<ReportContent data={blocked} onDownload={jest.fn()} />);
  expect(screen.getByText("Download exact version #7")).toBeDisabled();
});
