// RFC 5545: date-only reminders, escaped TEXT and UTF-8-safe content folding.
const text = (value) => String(value ?? "")
  .replace(/\\/g, "\\\\")
  .replace(/\r\n|\r|\n/g, "\\n")
  .replace(/;/g, "\\;").replace(/,/g, "\\,")
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");

const fold = (line) => {
  const encoder = new TextEncoder();
  let result = "", length = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) { result += "\r\n "; length = 1; }
    result += character; length += bytes;
  }
  return result;
};

const calendarDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) throw new Error("This follow-up has no valid deadline to export.");
  const [, year, month, day] = match.map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) {
    throw new Error("This follow-up has no valid deadline to export.");
  }
  return value.replace(/-/g, "");
};

export const canExportFollowUp = (task) => task?.status === "OPEN"
  && task.isDeleted === false && task.projectDeleted === false;

export function followUpCalendar(task, origin, now = new Date()) {
  if (!canExportFollowUp(task)) throw new Error("Only open follow-ups in active projects can be exported.");
  if (![task.id, task.projectId].every((id) => /^[1-9]\d*$/.test(String(id)))) {
    throw new Error("This follow-up has no valid record identifier.");
  }
  const date = calendarDate(task.dueDate);
  const site = new URL(origin);
  if (!["http:", "https:"].includes(site.protocol)) throw new Error("Calendar export needs an application address.");
  const description = [
    `Project: ${task.projectName || `Project #${task.projectId}`}`,
    `Responsible employee: ${task.assignee?.displayName || "Unknown"}`,
    `Follow-up #${task.id} · Project #${task.projectId}`,
    task.description,
    "Snapshot of an open follow-up. Changes and completion in Relief Projects do not update this calendar entry. Remove or replace it manually when needed.",
  ].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Relief Projects//Follow-up calendar export//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:follow-up-${task.projectId}-${task.id}@${encodeURIComponent(site.origin)}`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${date}`,
    "DURATION:P1D", "TRANSP:TRANSPARENT", "CLASS:PRIVATE",
    `SUMMARY:${text(task.title)}`,
    `DESCRIPTION:${text(description)}`,
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadFollowUpCalendar(task) {
  const contents = followUpCalendar(task, window.location.origin);
  const url = URL.createObjectURL(new Blob([contents], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = `follow-up-${task.projectId}-${task.id}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
