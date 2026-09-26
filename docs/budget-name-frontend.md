# Budget names — frontend

Required Budget name fields are available in normal and Admin creation/editing. Names are trimmed using Unicode whitespace handling and validated at 1–150 code points, with server validation remaining authoritative. Native maxLength is intentionally not used because it counts UTF-16 code units, which would reject valid supplementary characters early.

Budget labels use Name (ID: 123), falling back to Budget #123 without falling back to description. Applied to transaction editing, filters/sorting/export labels, Admin transaction create/update/delete/restore, and Admin budget update/delete/restore selectors. Identifiers remain unchanged. Descriptions remain in budget details and narrative exports. Audit changes display the friendly label Budget name and literal historical values.

Payment orders and ProjectSnapshot consume budgets for calculation/association but contain no budget-description dropdown label to replace. No extra requests were introduced. Normal save callbacks and Admin list updates retain the existing refresh behavior; navigating back to transaction selectors reloads their lookup lists.

Verification: focused name tests cover trimming, Unicode length, duplicate-name disambiguation, fallback labels, normal POST/PUT payloads, blocked blank-name writes, inline backend validation, and historical old/new names. Production build passed with existing lint and bundle-size warnings. git diff --check passed.

Before manual testing, restart the updated backend so V20 runs through the normal deployment process. This frontend task did not access or migrate the application database.

Manual checks: create a named budget, rename it, inspect its name-change history, and choose it in a transaction. Check Admin creation/editing and deleted-budget selectors. Existing budgets should initially show Budget #<id>. Test a duplicate name and confirm IDs distinguish it. Browser acceptance remains pending.

No commit created.

Final verification: all 272 tests across 48 suites passed. Temporary build files removed. Nothing committed.
