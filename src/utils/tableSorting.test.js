import {
  filterNumberRange,
  matchesDateRange,
  matchesNumberRange,
  matchesSelect,
  matchesText,
  sortRows,
} from "./tableSorting";

describe("sortRows", () => {
  const rows = [{ id: 20 }, { id: 3 }, { id: 11 }, { id: null }];

  test("sorts numeric values ascending without mutating input", () => {
    const result = sortRows(rows, (row) => row.id, "asc");
    expect(result.map((row) => row.id)).toEqual([3, 11, 20, null]);
    expect(rows.map((row) => row.id)).toEqual([20, 3, 11, null]);
  });

  test("sorts numeric values descending and keeps missing values last", () => {
    expect(sortRows(rows, (row) => row.id, "desc").map((row) => row.id)).toEqual([
      20,
      11,
      3,
      null,
    ]);
  });

  test("keeps equal values stable", () => {
    const equalRows = [{ id: 2, name: "first" }, { id: 1 }, { id: 2, name: "second" }];
    expect(sortRows(equalRows, (row) => row.id).map((row) => row.name)).toEqual([
      undefined,
      "first",
      "second",
    ]);
  });

  test("sorts labels alphabetically without regard to case", () => {
    const organizations = [
      { name: "Zulu Relief" },
      { name: "alpha aid" },
      { name: "Bravo Foundation" },
    ];

    expect(sortRows(organizations, (row) => row.name).map((row) => row.name)).toEqual([
      "alpha aid",
      "Bravo Foundation",
      "Zulu Relief",
    ]);
  });

  test("sorts decimal numbers numerically rather than lexically", () => {
    const amounts = [{ amount: "100" }, { amount: "9.5" }, { amount: "20" }];
    expect(sortRows(amounts, (row) => Number(row.amount)).map((row) => row.amount)).toEqual([
      "9.5",
      "20",
      "100",
    ]);
  });

  test("sorts timestamps chronologically", () => {
    const dates = [
      { date: "2026-12-01T10:00:00Z" },
      { date: "2025-01-15T10:00:00Z" },
      { date: "2026-02-01T10:00:00Z" },
    ];
    expect(
      sortRows(dates, (row) => new Date(row.date).getTime()).map((row) => row.date),
    ).toEqual([
      "2025-01-15T10:00:00Z",
      "2026-02-01T10:00:00Z",
      "2026-12-01T10:00:00Z",
    ]);
  });

  test("filters a numeric range inclusively", () => {
    expect(
      filterNumberRange(rows, (row) => row.id, { min: "4", max: "20" }).map(
        (row) => row.id,
      ),
    ).toEqual([20, 11]);
  });

  test("returns all rows when a numeric range is empty", () => {
    expect(filterNumberRange(rows, (row) => row.id, { min: "", max: "" })).toBe(rows);
  });

  test("matches text case-insensitively", () => {
    expect(matchesText("American Red Cross", "red cross")).toBe(true);
    expect(matchesText("UNICEF", "cross")).toBe(false);
  });

  test("matches selected values by their string representation", () => {
    expect(matchesSelect(4, "4")).toBe(true);
    expect(matchesSelect(4, "3")).toBe(false);
  });

  test("matches inclusive numeric and date ranges", () => {
    expect(matchesNumberRange("25.5", { min: "20", max: "25.5" })).toBe(true);
    expect(matchesDateRange("2026-08-13T15:00:00", { from: "2026-08-13", to: "2026-08-13" })).toBe(true);
  });
});
