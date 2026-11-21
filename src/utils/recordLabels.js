// Use supplied record context only; never infer another record's name from its ID.
export function namedReference(kind, id, name) {
  const label = typeof name === "string" ? name.trim() : "";
  if (!label && /^(transaction|payment order|payment|receipt|financier return|recipient return|signature|allocation)$/i.test(kind)) return `${kind} #${id}`;
  return `${label || "Name unavailable"} · ${kind} #${id}`;
}

export function transactionReference(transaction, id = transaction?.id) {
  const label = transaction?.transactionDescription;
  if (label) return namedReference("Transaction", id, label);
  return `Transaction #${id}`;
}
