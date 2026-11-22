# Record cards

Use `RecordCard` for saved list entries and record detail panels. Keep creation forms, table rows and workflow steps in their existing components.

- Choose `as="li"` inside a list, or retain the existing `div`, `section` or `article` element.
- The default `variant="card"` uses the existing saved-card styling. Use `variant="detail"` for an open detail panel.
- `viewing` shows the viewing marker and accent. `type` and `label` place the type label beneath it.
- Pass existing classes, refs, ARIA attributes and mobile-tile attributes through unchanged. Keep title, reference, status and domain content as children so their heading levels and layouts remain appropriate.
- Use `RecordCardActions` for action groups. It uses the shared right-aligned wrapping layout; `placement` accepts `section` (default), `header`, or `inline`. Keep the buttons in their intended keyboard order, and keep filters before the action group.
- Permissions, loading, disabled states, navigation and mutations belong to the caller. A viewing marker is not a workflow status.

Where a type label belongs inside an existing nested layout (such as document metadata), keep `RecordListLabel` there rather than adding a second label.
