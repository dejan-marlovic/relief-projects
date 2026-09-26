# Responsive shared navigation

- At 700px and below, the tab row becomes a labeled Current page select.
- Larger screens retain tabs with horizontal scrolling when needed. Route changes and resizing reveal the active tab without scrolling the page.
- Both navigation controls share role filtering. Project selection, logout, and page changes retain existing unsaved-change guards.
- The shared phone header and document scrolling now apply across Layout routes. This does not redesign individual Admin, Statistics, or other page contents.
- Project selection has an accessible label; active tabs expose aria-current. Native selects support keyboard and touch navigation.

Verification: all 261 tests across 45 suites passed, including seven new phone navigation checks. Browser visual acceptance remains for the running application.

Manual acceptance: check 390px, 768px, and desktop widths; choose a late tab such as About on tablet, resize, and confirm it stays visible. On phone, navigate using Current page, change projects, and cancel navigation while editing a record. Verify Admin and New Project choices with the appropriate roles.

Production build passed with existing lint and bundle-size warnings; git diff --check passed. Nothing committed.
