import React from 'react';
import styles from './RecordHeader.module.scss';

/** Keeps domain-specific headings, status and permission-aware actions intact. */
export default function RecordHeader({ as: Element = 'div', className = '', children, ...props }) {
  return <Element {...props} className={`${styles.header} ${className}`}>{children}</Element>;
}
