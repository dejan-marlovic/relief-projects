# Shared headers and filters

Use `RecordHeader` for wrapping record titles, status and action groups. Retain the original host element with `as`, heading levels and existing page classes. Use `RecordCardActions placement="header"` for actions within it. No permissions or record state belong in the header.

Use `FilterPanel` around filter controls. Pass `title` and `guidance` for the existing collapsed help, `showHeading` where a visible heading already exists, or `heading` for an existing custom heading. `as="form"` preserves submit behavior; native attributes, refs and handlers pass through. Field state, validation, query updates, reset behavior and pagination remain owned by each page. Keep creation actions above the panel.
