import { savedDraft } from "./savedDraft";
test("confirmed creation becomes an edit of the same record and resets correction reason", () => {
  const form = { action: "create", draft: { title: "Test", reason: "Reason" } };
  const next = savedDraft(form, { id: 12, revision: 0 }, { expectedTravelRevision: 4 });
  expect(next).toMatchObject({ action: "edit", record: { id: 12 }, expectedRevision: 0, expectedTravelRevision: 4, draft: { title: "Test", reason: "" }, reviewRequired: false });
  expect(next.savedDraft).toBe(JSON.stringify(next.draft));
});
test("unknown save results cannot enable more automatic mutations", () => {
  expect(() => savedDraft({ draft: {} }, {})).toThrow(/incomplete/);
  expect(() => savedDraft({ draft: {} }, null)).toThrow(/incomplete/);
});
