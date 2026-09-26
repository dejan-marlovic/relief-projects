import { canExportFollowUp, followUpCalendar, downloadFollowUpCalendar } from "./followUpCalendar";

const task = { id: 9, projectId: 2, projectName: "Water project", title: "Prepare report", description: "Check results", dueDate: "2026-10-25", status: "OPEN", isDeleted: false, projectDeleted: false, assignee: { displayName: "Alex" } };
const now = new Date("2026-09-26T12:30:45.000Z");
const exportTask = (changes = {}, origin = "https://relief.example") => followUpCalendar({ ...task, ...changes }, origin, now);
const unfold = (value) => value.replace(/\r\n /g, "");

test("exports one transparent all-day event on the exact date, without recipients or alarms", () => {
  const calendar = unfold(exportTask());
  expect(calendar).toContain("DTSTART;VALUE=DATE:20261025\r\nDURATION:P1D\r\n");
  expect(calendar).toContain("DTSTAMP:20260926T123045Z\r\n");
  expect(calendar).toContain("TRANSP:TRANSPARENT\r\nCLASS:PRIVATE\r\n");
  expect(calendar).toContain("Project: Water project\\n\\nResponsible employee: Alex");
  expect(calendar).toContain("Changes and completion in Relief Projects do not update");
  expect(calendar).not.toMatch(/ATTENDEE|ORGANIZER|VALARM|METHOD:|TZID/);
  expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  expect(calendar.endsWith("END:VCALENDAR\r\n")).toBe(true);
});

test.each(["2024-02-29", "2026-03-29", "9999-12-31", "1000-01-01"])("retains date-only %s without timezone conversion", (dueDate) => {
  expect(exportTask({ dueDate })).toContain(`DTSTART;VALUE=DATE:${dueDate.replace(/-/g, "")}`);
});

test.each(["2023-02-29", "1900-02-29", "2026-04-31", "2026-00-01", "2026-13-01", "2026-01-00", "2026-1-1", "0999-12-31", "2026-01-01T00:00:00Z", null])("rejects invalid date %s", (dueDate) => {
  expect(() => exportTask({ dueDate })).toThrow("valid deadline");
});

test("escapes calendar text and prevents content-line injection", () => {
  const title = "Review, budget; C:\\files\r\nBEGIN:VEVENT\nATTENDEE:mailto:test@example.com";
  const calendar = unfold(exportTask({ title, description: "Hello\u0000\rWorld" }));
  expect(calendar).toContain("SUMMARY:Review\\, budget\\; C:\\\\files\\nBEGIN:VEVENT\\nATTENDEE:mailto:test@example.com\r\n");
  expect(calendar.split("\r\n").filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
  expect(calendar.split("\r\n").some((line) => line.startsWith("ATTENDEE:"))).toBe(false);
  expect(calendar).toContain("Hello\\nWorld");
  expect(calendar).not.toContain("\u0000");
});

test("folds long Unicode text within 75 UTF-8 bytes without splitting characters", () => {
  const title = "Å😀界".repeat(100);
  const calendar = exportTask({ title });
  for (const line of calendar.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  expect(unfold(calendar)).toContain(`SUMMARY:${title}\r\n`);
  expect(calendar).not.toContain("�");
});

test("keeps identity stable across edits but distinct across projects and installations", () => {
  const uid = (value) => unfold(value).split("\r\n").find((line) => line.startsWith("UID:"));
  expect(uid(exportTask({ title: "Changed", dueDate: "2026-12-01" }))).toBe(uid(exportTask()));
  expect(uid(exportTask({ projectId: 3 }))).not.toBe(uid(exportTask()));
  expect(uid(exportTask({}, "https://other.example"))).not.toBe(uid(exportTask()));
  expect(exportTask({}, "https://relief.example/private?token=secret")).not.toContain("secret");
});

test.each([{ status: "COMPLETED" }, { isDeleted: true }, { projectDeleted: true }, { projectDeleted: null }, { isDeleted: undefined }])("excludes inactive or unavailable record %j", (changes) => {
  expect(canExportFollowUp({ ...task, ...changes })).toBe(false);
  expect(() => exportTask(changes)).toThrow("Only open follow-ups");
});

test("downloads locally, removes the anchor and revokes its URL", () => {
  jest.useFakeTimers();
  URL.createObjectURL = jest.fn(() => "blob:calendar");
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
    expect(this.download).toBe("follow-up-2-9.ics");
    expect(this.href).toBe("blob:calendar");
  });
  try {
    downloadFollowUpCalendar(task);
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL.mock.calls[0][0].type).toBe("text/calendar;charset=utf-8");
    expect(document.querySelector("a[download]")).toBeNull();
    jest.runOnlyPendingTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:calendar");
  } finally { click.mockRestore(); jest.useRealTimers(); }
});
