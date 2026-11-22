# Read and message states

`LoadingState`, `ErrorState`, and `EmptyState` preserve caller-provided content, classes and native attributes. Their default host is a paragraph; use `as` to retain existing markup. Loading uses `role="status"`, errors use `role="alert"`, and empty states do not imply an error or announce every filter update.

`ReadState` accepts the existing `{loading, data, error, retry}` shape. It only shows initial loading when `data == null`, preserving the existing background-refresh behavior. Retry labels and disabled states are configurable. Callers retain ownership of fetches, cancellation, empty detection and previously loaded content. Do not infer empty results from a failure, missing data or a numeric zero.

Keep workflow warnings and save/approval statuses separate: they are not loading or empty states.
