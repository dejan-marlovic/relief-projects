import React, { useId, useState } from "react";
import styles from "./FollowUps.module.scss";

export default function EmployeeFilter({ employees, value, onChange, disabled }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const options = [{ value: "", label: "All employees" }, ...employees.map(person => ({
    value: String(person.id),
    label: person.displayName || [person.firstName, person.lastName].filter(Boolean).join(" ") || `Employee #${person.id}`,
  }))];
  const selected = options.find(option => option.value === String(value));
  const matches = options.filter(option => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const expanded = open && !disabled;
  const choose = option => {
    onChange(option.value);
    setOpen(false);
    setQuery("");
    setActive(0);
  };
  return <div className={styles.employeeFilter}>
    <label htmlFor={id}>Assigned employee</label>
    <input id={id} role="combobox" autoComplete="off" disabled={disabled}
      aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-options`}
      aria-activedescendant={expanded && matches[active] ? `${id}-option-${active}` : undefined}
      placeholder="Type to find an employee"
      value={expanded ? query : selected?.label || "All employees"}
      onFocus={() => { setQuery(""); setActive(0); setOpen(true); }}
      onClick={() => { if (!open) { setQuery(""); setActive(0); setOpen(true); } }}
      onBlur={() => { setOpen(false); setQuery(""); }}
      onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
      onKeyDown={event => {
        if (event.key === "Escape") { setOpen(false); setQuery(""); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
          setActive(index => Math.max(0, Math.min(matches.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
        }
        if (event.key === "Enter" && expanded) {
          event.preventDefault();
          if (matches[active]) choose(matches[active]);
        }
      }} />
    {expanded && <ul id={`${id}-options`} role="listbox" aria-label="Employees" className={styles.employeeOptions}>
      {matches.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option"
        aria-selected={option.value === String(value)} className={index === active ? styles.activeEmployee : undefined}
        ref={element => { if (index === active) element?.scrollIntoView?.({ block: "nearest" }); }}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>{option.label}</li>)}
      {!matches.length && <li role="presentation">No employees found</li>}
    </ul>}
  </div>;
}
