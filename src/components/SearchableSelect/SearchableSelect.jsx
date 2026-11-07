import React, { forwardRef, useId, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./SearchableSelect.module.scss";

// Keep the real select for native validation, form data and existing change handlers.
// Only long lists use the searchable picker; short lists retain native behavior.
const SearchableSelect = forwardRef(function SearchableSelect({ children, onMouseDown, onClick, onKeyDown, ...props }, forwardedRef) {
  const selectRef = useRef(null);
  const searchRef = useRef(null);
  const id = useId();
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [label, setLabel] = useState("Choose an option");
  useEffect(() => {
    const select = selectRef.current;
    const next = Array.from(select.options, (option, index) => ({
      index, value: option.value, label: option.label,
      group: option.parentElement.tagName === "OPTGROUP" ? option.parentElement.label : "",
      disabled: option.disabled || (option.parentElement.tagName === "OPTGROUP" && option.parentElement.disabled),
      selected: option.selected,
    }));
    setOptions(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    if (select.disabled) setOpen(false);
  }, [children, props.value, props.disabled, props.multiple]);
  const searchable = options.filter(option => option.value !== "").length >= 8;
  const matches = options.filter(option => `${option.label} ${option.group}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const available = matches.filter(option => !option.disabled);
  const close = () => { setOpen(false); setQuery(""); selectRef.current?.focus(); };
  const show = (initial = "") => {
    const select = selectRef.current;
    const labelledBy = select.getAttribute("aria-labelledby");
    const labelText = item => {
      const copy = item.cloneNode(true);
      copy.querySelectorAll("select, input, button, textarea").forEach(control => control.remove());
      return copy.textContent;
    };
    const name = select.getAttribute("aria-label") || (labelledBy && labelledBy.split(/\s+/).map(key => document.getElementById(key)?.textContent || "").join(" ")) || Array.from(select.labels || [], labelText).join(" ") || select.previousElementSibling?.textContent || "Choose an option";
    setLabel(name.trim()); setQuery(initial); setActive(0); setOpen(true);
  };
  const choose = option => {
    const select = selectRef.current;
    const target = select.options[option.index];
    if (select.disabled || !target || target.disabled || option.disabled) return;
    if (!select.multiple && select.value === option.value) { close(); return; }
    if (select.multiple) target.selected = !target.selected;
    else select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    if (select.multiple) {
      setOptions(current => current.map(item => ({ ...item, selected: select.options[item.index]?.selected || false })));
      searchRef.current?.focus();
    } else close();
  };
  return <><select {...props} ref={element => {
    selectRef.current = element;
    if (typeof forwardedRef === "function") forwardedRef(element);
    else if (forwardedRef) forwardedRef.current = element;
  }} onMouseDown={event => {
    onMouseDown?.(event);
    if (!event.defaultPrevented && searchable && !props.disabled && event.button === 0) { event.preventDefault(); show(); }
  }} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && searchable && !props.disabled) { event.preventDefault(); if (!open) show(); }
  }} onKeyDown={event => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !searchable || props.disabled || event.ctrlKey || event.metaKey || event.altKey) return;
    if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key) || event.key.length === 1) {
      event.preventDefault(); show(event.key.length === 1 && event.key !== " " ? event.key : "");
    }
  }}>{children}</select>
    {open && !props.disabled && createPortal(<div className={styles.backdrop} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className={styles.picker}
        onChange={event => event.stopPropagation()} onBlur={event => event.stopPropagation()}
        onKeyDown={event => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
          if (event.key === "Tab") {
            const controls = Array.from(event.currentTarget.querySelectorAll('input, button:not(:disabled)'));
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}>
        <h3 id={`${id}-title`}>{label}</h3>
        <input ref={searchRef} autoFocus role="combobox" aria-label={`Search ${label}`} aria-expanded="true" aria-autocomplete="list"
          aria-controls={`${id}-list`} aria-activedescendant={available[active] ? `${id}-${available[active].index}` : undefined}
          placeholder="Type to search…" value={query} onChange={event => { setQuery(event.target.value); setActive(0); }}
          onKeyDown={event => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(0, Math.min(available.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))); }
            if (event.key === "Enter") { event.preventDefault(); if (available[active]) choose(available[active]); }
          }} />
        {props.multiple && <p>Select or deselect items. Existing selections stay selected while you search.</p>}
        <ul id={`${id}-list`} role="listbox" aria-label={label} aria-multiselectable={props.multiple || undefined}>
          {matches.map(option => <li key={option.index} id={`${id}-${option.index}`} role="option" aria-selected={option.selected} aria-disabled={option.disabled || undefined}
            className={available[active]?.index === option.index ? styles.active : undefined}
            ref={element => { if (available[active]?.index === option.index) element?.scrollIntoView?.({ block: "nearest" }); }}
            onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>
            {option.selected && <span aria-hidden="true">✓ </span>}{option.group && `${option.group} — `}{option.label}
          </li>)}
        </ul>
        {!matches.length && <p role="status">No matching options</p>}
        <button type="button" onClick={close}>Close</button>
      </div>
    </div>, document.body)}
  </>;
});
export default SearchableSelect;
