import React from 'react';

/** Brief narrative context for list cards; long content remains available. */
export default function RecordExcerpt({ text, label = 'Description', limit = 180 }) {
  if (!text) return null;
  const value = String(text);
  if (value.length <= limit) return <p style={{whiteSpace:'pre-wrap', overflowWrap:'anywhere'}}>{label && <strong>{label}: </strong>}{value}</p>;
  return <div><p>{label && <strong>{label}: </strong>}{value.slice(0, limit).trimEnd()}…</p><details><summary>Read full {label.toLowerCase()}</summary><p style={{whiteSpace:'pre-wrap', overflowWrap:'anywhere'}}>{value}</p></details></div>;
}
