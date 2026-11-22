import React from 'react';
import { FiCheckCircle, FiClock, FiInfo } from 'react-icons/fi';
import styles from './InlineStatus.module.scss';

export default function InlineStatus({ tone = 'neutral', className = '', children, ...props }) {
  const Icon = tone === 'success' ? FiCheckCircle : tone === 'pending' ? FiClock : FiInfo;
  return <p role="status" {...props} className={`${styles.status} ${styles[tone] || ''} ${className}`}><Icon aria-hidden="true" /><span>{children}</span></p>;
}
