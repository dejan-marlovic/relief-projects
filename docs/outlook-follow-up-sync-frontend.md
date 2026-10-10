# Outlook follow-up publication frontend

V54 connection/status UI is in Follow-ups → My follow-ups. Fixed OAuth landing URL for local configuration: http://localhost:3000/follow-ups/outlook (no query or fragment). This route selects My follow-ups; application authentication remains required. Microsoft registration and credentials are separate operator work, not performed here.

The panel requires capability version 1 and current server permissions. Requests carry existing application bearer authentication, no-store caching and credentials:include for the backend correlation cookie. Configure frontend/backend origins consistently (localhost rather than mixing localhost and 127.0.0.1) and allow credentialed CORS on the backend. Returned authorization URLs are restricted to HTTPS login.microsoftonline.com OAuth authorization paths. No credential or provider response is persisted by the frontend.

Connect and account confirmation require explicit acknowledgement of title publication, own-account scope and disabled updates/removals. Callback return fetches fresh status; it never confirms automatically. Existing unsaved-task guard runs before leaving for Microsoft. Unknown versions and failed status reads disable mutation controls.

Commands use expectedRevision, never retry automatically, and refresh status after success/failure. Acknowledgement resets after a command or changed connection revision/state. Check-now means queued work, not delivery. The panel refreshes on focus and every visible idle minute. It shows observation time, discovered-mapping counts, up to 20 attention items, account hints and cleanup deadline. ACTIVE/zero counts never imply full synchronization.

PATCH/DELETE are blocked in the backend. UI states that published test appointments become stale, completion/deletion/disconnect cannot remove them, and manual Outlook cleanup is required. No success toast from the generic mutation wrapper is emitted for these integration commands. Forget versus cleanup-window disconnect is explicit, including encrypted credentials retained while offline until startup scrubbing and consent/backups not erased.

Verification: 47 tests passed across six suites (Outlook panel, Follow-ups, board, details, calendar export and appFetch). Production build and lint results recorded in the task response. No live Microsoft calls, registration, credentials, application database changes, restart, commit or push performed by frontend work.

## 10 October additive capabilities and live acceptance

The user completed registration, personal-account connection and initial publication: an all-day “Follow-up: new test” appointment appeared on 28 October 2026 in the Microsoft calendar, separately from the linked Google calendar. This is evidence of initial creation only. The frontend work did not access Microsoft credentials or change the calendar.

The current label is creation only, updates blocked, removal manual. The backend's creationSupported capability cannot override configuration or command permissions; explicit false disables enrollment, while older version-1 responses remain compatible. Meeting/move verification is explained when its blocker is present. No capability in this release enables automatic mutation.

Attention entries display backend messages, safe action guidance and observation dates. Unknown codes/actions remain visible. Ownership changes and uncertain creation never suggest blind replacement or ICS import. Removal review counts are explicitly discovered mappings, not current remote inventory; uncertain and already manually removed entries can be counted. Manual deletion may leave a missing/moved warning and does not authorize reposting.

Cleanup credential state, retention deadline and Forget availability are distinct from removal capability. Normal disconnect retains its existing command and up-to-24-hour policy, but the UI does not imply that removal is scheduled or that credentials will be used for cleanup/refresh. Erasure is not calendar removal. Check now queues observation and cannot apply blocked edits.

The additive authorization phase/expiry/recovery fields explain incomplete OAuth attempts. An absent account cannot be confirmed. Recovery uses an explicit Forget action followed by fresh status and a new connection, never automatic command replay.

Manual acceptance after backend restart: edit a nonsensitive published task and refresh after worker observation; verify the blocked-update guidance and unchanged Outlook appointment. Complete it and verify manual-removal guidance. Disconnect/Forget should distinguish credential erasure from retained calendar entries. No full-sync success claim is permitted.

Additive frontend regression verification: 51 tests passed across the same six suites, including older status compatibility, creation capability gating, missing-account confirmation protection, OAuth recovery guidance, actionable/unknown attention messages, removal inventory limitations, credential state and the unchanged disconnect payload. The first test invocation was blocked before tests by a Windows temporary-cache permission error; the successful run used a project-local Jest cache. Changed component/test ESLint and tracked whitespace checks passed.

Production build completed successfully with the bundle-size advisory. No live browser or Microsoft mutation test was performed for these frontend status changes; manual acceptance remains user-controlled.

User smoke acceptance on 10 October after rebuild/restart: the updated status panel rendered the additive fields. Completing follow-up #5 moved it to Done; a later worker observation changed its mapping to DELETE_BLOCKED / MANUAL_REMOVAL_REQUIRED and the review count to one. The user subsequently reported manually deleting the test appointment in Outlook. Missing/moved detection after that deletion was not independently verified. Automatic updates/deletions remain disabled, and broader acceptance remains open.
