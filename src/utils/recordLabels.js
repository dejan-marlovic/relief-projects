// Use supplied record context only; never infer another record's name from its ID.
export function namedReference(kind, id, name) {
  const label = typeof name === "string" ? name.trim() : "";
  return `${label || "Name unavailable"} · ${kind} #${id}`;
}

export function transactionReference(transaction, id = transaction?.id) {
  const label = transaction?.transactionDescription || transaction?.projectName || transaction?.budgetName;
  if (label) return namedReference("Transaction", id, label);
  const date = transaction?.datePlanned;
  return `${date ? `Planned ${String(date).slice(0, 10)}` : "Transaction name unavailable"} · Transaction #${id}`;
}
