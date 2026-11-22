# Record cards

Use `RecordCard` for saved list entries and record detail panels. Keep creation forms, table rows and workflow steps in their existing components.

- Choose `as="li"` inside a list, or retain the existing `div`, `section` or `article` element.
- The default `variant="card"` uses the existing saved-card styling. Use `variant="detail"` for an open detail panel.
- `viewing` shows the viewing marker and accent. `type` and `label` place the type label beneath it.
- Pass existing classes, refs, ARIA attributes and mobile-tile attributes through unchanged. Keep title, reference, status and domain content as children so their heading levels and layouts remain appropriate.
- Use `RecordCardActions` for action groups. It uses the shared right-aligned wrapping layout; `placement` accepts `section` (default), `header`, or `inline`. Keep the buttons in their intended keyboard order, and keep filters before the action group.
- Permissions, loading, disabled states, navigation and mutations belong to the caller. A viewing marker is not a workflow status.

Where a type label belongs inside an existing nested layout (such as document metadata), keep `RecordListLabel` there rather than adding a second label.
List cards should show identity, current status, responsible person or party, relevant dates and amounts, and a brief narrative where available. Use `RecordExcerpt` for long descriptions or notes: it shows a short preview and an explicit full-text disclosure. Keep workflow steps in the opened detail view or a closed disclosure, while keeping permission-controlled actions and important warnings visible.

Border hierarchy: the outer RecordCard is the strongest frame. Ordinary nested sections, workflow tiles, disclosures and nested record cards use a lighter 1px separator without a card shadow. Do not apply this treatment to validation alerts, state badges, input borders or keyboard focus indicators.
