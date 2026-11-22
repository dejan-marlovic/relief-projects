import React, { forwardRef } from 'react';
import styles from './AttachmentItem.module.scss';

/** A quiet supporting-document row. Callers retain exact-version metadata,
 * availability notices, permission checks and download/link handlers. */
const AttachmentItem = forwardRef(function AttachmentItem({ as: Element = 'li', className = '', compact = true, children, ...props }, ref) {
  return <Element {...props} ref={ref} className={`${compact ? styles.item : ""} ${className}`}>{children}</Element>;
});
export default AttachmentItem;
