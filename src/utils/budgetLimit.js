/* global BigInt */
export const budgetLimitError = (value) => {
  const text = String(value ?? "").trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return "Enter a positive budget limit with up to three decimal places.";
  const [whole, fraction = ""] = text.split(".");
  if (fraction.slice(3).replace(/0/g, "")) return "Budget limit supports at most three meaningful decimal places.";
  const scaled = BigInt(whole || "0") * BigInt(1000) + BigInt((fraction + "000").slice(0, 3));
  return scaled <= BigInt(0) || scaled > BigInt("999999999999999999999") ? "Budget limit must be greater than zero and at most 999999999999999999.999." : "";
};
