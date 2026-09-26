# Project image viewer keyboard access

Implemented 26 September 2026 as an independent frontend fix. Related active tasks were reviewed; the viewer component and styles had no existing changes. The shared Project page, financial workflows, notification work and backend were left untouched.

## Gap and behavior

The viewer previously used a div with `aria-modal`, which did not move focus into the viewer or prevent keyboard interaction with the underlying page. It also installed a global arrow-key listener and did not restore focus on close.

- A native `dialog`, mounted in a body portal, now provides browser modality.
- Opening focuses Close zoom and pauses body scrolling. Closing or unmounting restores the previous overflow style and previous focus when that element still exists.
- Escape uses native dialog cancellation. Close and backdrop actions retain the existing parent callback.
- Arrow keys remain scoped to the dialog and use the current callback. Image changes do not reset focus; modified keyboard shortcuts are left alone.
- The dialog has an accessible name and caption description; image changes are announced politely, the active thumbnail is identified, and buttons have visible focus outlines.
- An empty gallery shows a message rather than an image with an empty URL.

## Verification

Five focused React tests passed, covering modal setup, focus/scroll restoration, close actions, navigation, callback changes, empty/single galleries, Strict Mode and unmount cleanup. Component/test ESLint, Sass compilation and scoped `git diff --check` passed.

The test environment mocks native dialog methods. Additional isolated browser verification used the actual component, compiled with local dependencies and synthetic images: opening focused Close, background controls disappeared from the accessibility tree, Tab navigation reached viewer controls, the right arrow changed the image without resetting focus, and Escape closed the viewer and restored the opener. No application data or credentials were used. The live app was at login with an unrelated appFetch.js lint overlay at the time, so authenticated application acceptance and full visual/theme checks remain pending. No full-suite run was performed for this isolated component change.

Browser acceptance: open a project image; Tab and Shift+Tab should remain inside the viewer, arrows should change images, and Escape should close it. Check background scrolling, visible focus, captions, and phone/short-window layout. Existing image-opening controls in Project.js are outside this change; their keyboard accessibility was not expanded here because that file already has unrelated working changes.

No backend/API changes or live data mutations were made. The user subsequently authorized a scoped commit of this change.
