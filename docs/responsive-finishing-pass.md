# Responsive finishing pass

Updated login, Guide, About, theme settings, logo settings, the return-reason dialog, and the image viewer's short-screen layout. Changes are CSS-only: narrower padding, text wrapping, constrained images, touch targets, stacked settings, and viewport-aware dialogs.

Verification:
- All 264 tests across 46 suites passed.
- Production build passed with existing lint and bundle-size warnings.
- Production login preview checked at 390x844, 768x1024, 1440x900, and 667x375. No horizontal overflow; short screens allow vertical scrolling. No credentials entered.
- git diff --check passed. Preview tab/server cleaned up and viewport reset.

Remaining visual acceptance in an authenticated session:
- Guide: contents links, nested lists, and back-to-top links.
- About: cards and numbered flow sections.
- Theme settings: creator fields, color pickers, long theme names, and buttons.
- Logo settings: previews, upload area, status badges, and messages.
- Return reason: textarea and both buttons with the software keyboard visible.
- Image viewer: toolbar and close button in portrait and landscape.
- Smoke-check the main project, budget, transaction, payment-order, and Admin flows at phone, tablet, and desktop widths. Existing automated tests are not a substitute for that complete visual check.

No backend changes or commit.
