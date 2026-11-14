import { render, screen } from "@testing-library/react";
import ArchiveAttribution from "./ArchiveAttribution";

test("shows both recorded archive and unarchive actors without losing the earlier action", () => {
  render(<ArchiveAttribution value={{ latestArchive: { actor: { username: "mira" }, occurredAt: "2026-11-01T10:00:00Z" }, latestUnarchive: { actor: { username: "dejan" }, occurredAt: "2026-11-02T10:00:00Z" } }} />);
  expect(screen.getByLabelText("Archive attribution")).toHaveTextContent("Archived by mira");
  expect(screen.getByLabelText("Archive attribution")).toHaveTextContent("Unarchived by dejan");
});
test("uses retained archive attribution on older responses without inventing an unarchiver", () => {
  render(<ArchiveAttribution value={{ archive: { recordedBy: { username: "mira" } } }} />);
  expect(screen.getByText("mira")).toBeInTheDocument();
  expect(screen.queryByText("Unarchived by")).not.toBeInTheDocument();
});
