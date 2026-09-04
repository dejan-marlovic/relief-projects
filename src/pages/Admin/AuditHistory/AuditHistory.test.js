import { buildAuditQuery, formatAuditTimestamp } from "./AuditHistory";

describe("audit history helpers", () => {
  test("builds a paginated query containing only active filters", () => {
    const query = new URLSearchParams(buildAuditQuery({
      entityType: "BUDGET",
      entityId: "12",
      projectId: "",
      action: "APPROVE",
      performedBy: " 7 ",
      occurredFrom: "",
      occurredTo: "",
    }, 2, 20));

    expect(Object.fromEntries(query)).toEqual({
      page: "2",
      size: "20",
      entityType: "BUDGET",
      entityId: "12",
      action: "APPROVE",
      performedBy: "7",
    });
  });

  test("formats missing and invalid timestamps safely", () => {
    expect(formatAuditTimestamp(null)).toBe("—");
    expect(formatAuditTimestamp("not-a-date")).toBe("—");
  });
});
