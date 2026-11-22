import React from 'react';
import FilterHelp from '../FilterHelp/FilterHelp';

/** Presentation only: filter state, validation and pagination stay with callers. */
export default function FilterPanel({ as: Element = 'div', title, guidance, showHeading = false, heading, children, ...props }) {
  return <Element {...props}>
    {heading || (showHeading && title && <h3>{title}</h3>)}
    {guidance && <FilterHelp title={showHeading ? undefined : title}>{guidance}</FilterHelp>}
    {children}
  </Element>;
}
