import React from 'react';
import { FiUploadCloud, FiChevronDown } from 'react-icons/fi';
import styles from './UploadAndAttach.module.scss';

// Presentation only: upload permissions, validation and linking stay with callers.
export default function UploadAndAttach({ title = 'Upload and attach', children }) {
  return <details className={styles.panel}>
    <summary><FiUploadCloud aria-hidden="true" /><span>{title}</span><FiChevronDown className={styles.chevron} aria-hidden="true" /></summary>
    <div className={styles.body}>{children}</div>
  </details>;
}
export function UploadDropzone({ children, className = '', ...props }) {
  return <button {...props} type="button" className={`${styles.dropzone} ${className}`}>{children}</button>;
}
