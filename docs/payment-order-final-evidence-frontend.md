# Late payment evidence frontend

4 October 2026. Implements the backend `payment-order-final-evidence.md` contract (V49/V50).

- Payment-order Details & activity contains a separate, lazy-loaded Late payment evidence panel. Capabilities and issues are loaded even for empty collections; Booked status does not impose ordinary-document restrictions on this panel.
- Candidates are resolved from the saved order's header transaction and owning project, never the global project selector. Selection includes active historical exact versions and displays their status. Finance selects existing uploads; existing Admin/Project Manager upload navigation remains separate.
- Attach, remove and atomic replace require a reason and collection revision. Errors preserve the draft, refresh collection/history and require explicit review before another command. No automatic mutation retries, file deletion or financial/lifecycle changes.
- Current entries display captured names, versions, attribution, reasons, replacement identity and warnings. Retained decisions are paginated. Protected downloads use the selected document ID, never the newest chain head.
- Ordinary supporting documents explicitly disclose that approval-time inclusion was not recorded. The printable report renders late association roles and attribution separately, with no approval/signature/completeness claim. Successful changes notify open report tabs to refresh their coherent metadata endpoint; manual refresh remains available.

Verification: 29 focused tests passed across late evidence, ordinary financial documents and payment-order report. Targeted lint passed. Production build passed with existing application lint/bundle warnings. User reports rebuilding and restarting the backend with restored V49 and V50; user confirmed attaching exact document #22 to Approved Booked order #3, its inclusion in the printable report, and successful download of the expected test workbook. Replacement/removal, conflict and broader operational acceptance remain pending.

Manual smoke test: open an Approved order, expand Details & activity and Late payment evidence, attach an existing same-project exact version with a role/reason, then view/print its report. Replace and remove with reasons and inspect retained history. Test a Booked Approved order, unavailable documents, and competing revisions during broader acceptance. File assembly and verification remain outside this slice.
