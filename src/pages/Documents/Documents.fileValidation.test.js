import { validateDocumentFile } from "./Documents";

const makeFile = ({ name, type, size = 100 }) => ({ name, type, size });

describe("document upload client validation", () => {
  test.each([
    ["report.pdf", "application/pdf"],
    ["report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["budget.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["briefing.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ["notes.txt", "text/plain"],
    ["data.csv", "text/csv"],
    ["photo.jpg", "image/jpeg"],
    ["image.png", "image/png"],
    ["image.webp", "image/webp"],
    ["video.mp4", "video/mp4"],
    ["audio.mp3", "audio/mpeg"],
  ])("accepts %s", (name, type) => {
    expect(validateDocumentFile(makeFile({ name, type }))).toBe("");
  });

  test("rejects unsupported and multiple-extension filenames", () => {
    expect(validateDocumentFile(makeFile({ name: "payload.exe", type: "application/octet-stream" })))
      .toMatch(/Unsupported file type/);
    expect(validateDocumentFile(makeFile({ name: "report.final.pdf", type: "application/pdf" })))
      .toMatch(/Multiple extensions/);
  });

  test("rejects empty, oversized, and mismatched files", () => {
    expect(validateDocumentFile(makeFile({ name: "empty.pdf", type: "application/pdf", size: 0 })))
      .toMatch(/empty/);
    expect(validateDocumentFile(makeFile({ name: "large.pdf", type: "application/pdf", size: 51 * 1024 * 1024 })))
      .toMatch(/too large/);
    expect(validateDocumentFile(makeFile({ name: "photo.jpg", type: "application/pdf" })))
      .toMatch(/do not match/);
  });

  test("allows a missing browser MIME value so the backend can inspect content", () => {
    expect(validateDocumentFile(makeFile({ name: "report.pdf", type: "" }))).toBe("");
  });
});
