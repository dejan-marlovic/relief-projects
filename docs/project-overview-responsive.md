# Responsive project overview

The Project page now uses tighter spacing, wrapping headers, constrained form controls, and touch-sized actions on tablet and phone screens. Media, detail cards, and project links stack below 1100px. Phone date/coordinate fields stack, and the project header scrolls with the document. Long project/organization names, sector pills, notes, and memos wrap within their containers.

Snapshot chart columns stack earlier to avoid a cramped participant panel; phone KPI and participant sections use one column. Memo editors fit their containers. The image viewer has a wrapping phone toolbar, larger controls, and a scrollable caption area.

Changes are presentational only. Data loading, permissions, saving, exports, uploads, calculations, and chart data remain unchanged.

## Verification

- All 13 focused ProjectSnapshot and Layout authorization tests passed.
- Production build passed with existing lint and bundle-size warnings. Diff reviewed and whitespace checks passed.
- Isolated representative markup using production styles was checked at 320px and 900px, including snapshot cards, memos, date fields, and project links. The phone preview had no horizontal document overflow.
- Live chart rendering, image-viewer interaction, and authenticated save/upload acceptance remain manual checks. No application data changed.

## Manual acceptance

Open Project at phone/tablet widths. Check the snapshot charts and participant list, edit project fields, inspect sector/organization/participant links, and try memo editing. Open an existing image and check its toolbar and caption. Confirm the project selector and navigation remain reachable, and read-only roles retain their restrictions.

No backend restart required. Nothing committed.
