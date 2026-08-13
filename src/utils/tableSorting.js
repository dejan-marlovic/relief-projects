export const sortRows = (rows, getValue, direction = "asc") => {
  const multiplier = direction === "desc" ? -1 : 1;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = getValue(left.row);
      const rightValue = getValue(right.row);
      const leftMissing = leftValue == null || leftValue === "";
      const rightMissing = rightValue == null || rightValue === "";

      // Missing values stay at the end in either direction.
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      if (leftMissing && rightMissing) return left.index - right.index;

      const comparison =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return comparison === 0
        ? left.index - right.index
        : comparison * multiplier;
    })
    .map(({ row }) => row);
};

export const toSortableNumber = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const toSortableDate = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const filterNumberRange = (rows, getValue, range) => {
  const min = toSortableNumber(range?.min);
  const max = toSortableNumber(range?.max);
  if (min == null && max == null) return rows;

  return rows.filter((row) => {
    const value = toSortableNumber(getValue(row));
    if (value == null) return false;
    return (min == null || value >= min) && (max == null || value <= max);
  });
};

export const matchesText = (value, query) =>
  !query || String(value ?? "").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());

export const matchesSelect = (value, selected) =>
  !selected || String(value ?? "") === String(selected);

export const matchesNumberRange = (value, range) => {
  const min = toSortableNumber(range?.min);
  const max = toSortableNumber(range?.max);
  if (min == null && max == null) return true;
  const numeric = toSortableNumber(value);
  return numeric != null && (min == null || numeric >= min) && (max == null || numeric <= max);
};

export const matchesDateRange = (value, range) => {
  if (!range?.from && !range?.to) return true;
  const timestamp = toSortableDate(value);
  if (timestamp == null) return false;
  const from = range.from ? new Date(`${range.from}T00:00:00`).getTime() : null;
  const to = range.to ? new Date(`${range.to}T23:59:59.999`).getTime() : null;
  return (from == null || timestamp >= from) && (to == null || timestamp <= to);
};
