import React from 'react';
import ActionButton from '../ActionButton/ActionButton';

// Keep the caller's element, classes and children so existing layout and retry
// controls retain their appearance and behavior.
export function LoadingState({ as: Element = 'p', children = 'Loading…', ...props }) {
  return <Element role="status" {...props}>{children}</Element>;
}
export function ErrorState({ as: Element = 'p', children, ...props }) {
  return <Element role="alert" {...props}>{children}</Element>;
}
export function EmptyState({ as: Element = 'p', children = 'No records found.', ...props }) {
  return <Element {...props}>{children}</Element>;
}
export default function ReadState({ state, onRetry = state.retry, retryLabel = 'Retry', retryDisabled = false }) {
  return <>
    {state.loading && state.data == null && <LoadingState />}
    {state.error && <ErrorState>{state.error} {onRetry ? <ActionButton type="button" disabled={state.loading || retryDisabled} onClick={onRetry}>{retryLabel}</ActionButton> : 'Reload the page to try again.'}</ErrorState>}
  </>;
}
