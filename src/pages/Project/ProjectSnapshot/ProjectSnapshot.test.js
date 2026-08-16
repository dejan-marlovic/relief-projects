import { getParticipantNames, summarizeProjectSnapshot } from "./ProjectSnapshot";

describe("project snapshot summary", () => {
  test("calculates project record counts and the SEK reporting budget", () => {
    expect(summarizeProjectSnapshot({
      costDetails: [
        { amountReportingCurrency: 1250 },
        { amountReportingCurrency: "750" },
        { amountReportingCurrency: null },
      ],
      recipients: [{}, {}],
      relations: [{}],
      transactions: [{}, {}, {}],
      paymentOrders: [{}],
      signatures: [{}, {}],
      documents: [{}, {}, {}, {}],
      organizationOptions: [],
    })).toEqual({
      reportingBudgetSek: 2000,
      recipients: 2,
      partners: 1,
      transactions: 3,
      paymentOrders: 1,
      signatures: 2,
      documents: 4,
      recipientNames: ["Recipient", "Recipient"],
      partnerNames: ["Organization"],
      documentNames: [
        "Document",
        "Document",
        "Document",
        "Document",
      ],
    });
  });

  test("resolves recipient, partner, and document names for chart tooltips", () => {
    const summary = summarizeProjectSnapshot({
      recipients: [{ id: 5, organizationId: 10 }],
      relations: [{ organizationId: 11 }],
      documents: [{ id: 7, documentName: "assessment.pdf" }],
      organizationOptions: [
        { id: 10, name: "Local Relief Network" },
        { id: 11, name: "Red Cross" },
      ],
    });

    expect(summary.recipientNames).toEqual(["Local Relief Network"]);
    expect(summary.partnerNames).toEqual(["Red Cross"]);
    expect(summary.documentNames).toEqual(["assessment.pdf"]);
  });

  test("resolves project participant employee names", () => {
    expect(getParticipantNames(
      [{ employeeId: 4 }, { employeeId: 8 }],
      [
        { id: 4, firstName: "Dejan", lastName: "Marlovic" },
        { id: 8, name: "Alex Johnson" },
      ]
    )).toEqual(["Dejan Marlovic", "Alex Johnson"]);
  });
});
