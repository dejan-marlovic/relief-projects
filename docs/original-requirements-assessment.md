# Original requirements assessment

Reviewed 18 September 2026 against frontend commit `e9eb22e` and backend commit `54c5ef5`.

The system is a strong implementation of the original **project administration and financial-record core**. It substantially extends the supplied Access prototype with controlled financial approvals, calculation validation, child records, change history, and responsive interfaces. It does **not yet cover the full programme-management and archiving scope** described in the broader documents.

The largest omissions are structured project documents and closure, assigned deadlines and follow-up, and reporting that separates funding, commitments, and completed financial movements. There are also specific differences from the original Excel budget and Access fields that deserve decisions before adding more features.

This is a requirements and source-code assessment, not a production certification. No application code, supplied document, or application database was changed. No migrations, application test suites, live browser acceptance, or Access macros were run for this review.

## Evidence and interpretation

| Source | What was inspected | How to use it |
|---|---|---|
| [Original specification][spec] | All extracted text, including the requested modules and Swedish workflow fragments | Explicit but vague scope. Dates, placeholders, and incomplete approvals indicate a draft rather than a detailed acceptance contract. |
| [2023 archiving guide][archive] | All text and 19 content illustrations, plus the two branding images | Operational requirements for records, payment evidence, project closure, and physical/digital archiving. Its ten-year period is the supplied organisation's policy, not a legal conclusion from this review. |
| [Old application screenshots][screens] | All seven embedded 800×600 screenshots, in document order | Evidence of visible fields and intended workflows. These show Pius 1.1 and must not be assumed to be screenshots of the supplied MDB. |
| [Access prototype][mdb] | All 19 user-table schemas and row counts, declared relationships, saved SQL query definitions, form/report/macro catalogue names, and status lookup values | Read with Jackcess in explicit read-only mode. It contains one project and very small sample tables. Forms, VBA, macros, and report layouts were not executed or visually rendered. |
| [RRM budget workbook][xlsx] | The single `Syria RRM` sheet, formulas and cached values, populated range A1:K54, and rendered views | A concrete budgeting example, including exceptions and manual entries. It is not a clean universal calculation specification. |
| Current implementation | Frontend pages, exports, models, DTOs, controllers, services, repositories, storage/security configuration, and existing handoff reports | Implementation evidence. “Present” means supported by inspected code, not newly verified end to end. |

Requirements are classified below as **present**, **partial**, or **not found**. “Not found” means no corresponding model/API/page was found in the inspected code inventories and targeted searches. A memo or uploaded spreadsheet can support a manual workaround, but that does not implement an assigned, validated workflow.

The referenced “IR follow up list” was not among the supplied files. Its detailed stages and checks cannot be assessed. The archive guide also contains inconsistent numbering/examples, so its folder taxonomy and project-number rules should be confirmed before enforcing them.

## Coverage

| Requirement or reference behaviour | Assessment | Evidence and remaining gap |
|---|---|---|
| Web application usable on phones, tablets, and computers | Present in implementation | Responsive pages, compact financial rows, wrapping forms and scrollable navigation exist. Existing responsive reports record representative checks; this review did not repeat a full device/accessibility acceptance pass. [Layout][c-layout], [cost-detail styles][c-cost-style]. |
| Project identity, description, status, dates, revised dates, parent project | Mostly present | Project code, donor reference, name, PIN, description, status, approval flag, original/revised dates, parent and type exist. Separate Swedish/English titles from screenshot 1 and `tblProjekt.Benämning/Name` are absent. [Project model][c-project]. |
| Region, theme, sector, target group, caseworker | Partial | Address/country, type, multiple sectors and employee/position assignments exist. Dedicated region, theme and target-group fields are not present in Project. A description can hold them only as unstructured text. [Project][c-project], [employee assignments][c-employees]. |
| Organisations, partners, financiers and contact/bank information | Substantially present | Organisation relationships have configurable roles/statuses; a separate Partners tab is not necessary. Bank records exist, but the prototype's distinct account-holder name and sort code do not have direct counterparts in BankDetail. Confirm whether these are needed for operational payment output. [Relationships][c-org-rel], [bank details][c-bank]. |
| Users, roles, organisation/project/transaction statuses, currencies | Present | Corresponding models and administration screens exist, with backend role enforcement. Project assignment does not currently imply project-specific read permission. [Security][c-security]. |
| Budget cost hierarchy, calculations and currency conversions | Present, with input compatibility gaps | Direct/indirect types, categories, descriptions, units, frequency, unit price, allocation share and four amount outputs match the workbook's main structure. Exact numeric inputs and some summaries do not. See workbook findings below. [Calculator][c-calculator], [budget export][c-budget-ui]. |
| Financial approval, return reasons and editable-state restrictions | Present | Budgets, transactions and payment orders have explicit lifecycle operations, authorization and recorded transitions. This is stronger than a single editable approval checkbox. [Budget checks][c-budget-checks], [audit scope][c-audit]. |
| Project/organisation assessment and first-stage approval | Partial | Project has an editable Yes/No approval field. No comparable project assessment submission/review workflow, recorded decision package or first-stage gate was found. Financial approval does not supply this missing project approval process. [Project service][c-project-service]. |
| Funding requested/approved, own contribution and financier coverage | Partial | Transactions hold financier, requested/approved amounts and an own-contribution flag. The old funding screen's per-financier currencies/rates, references and derived coverage percentages are not reproduced. Existing “first/second share” meaning needs clarification. [Transaction][c-transaction], [guide][c-guide]. |
| Planned versus performed transactions, refunds and finance feedback | Partial | Planned dates, statuses, allocations, orders and signatures exist. No dedicated actual-payment/reconciliation record or refund linkage was found. A generic status or approval is not proof of settlement. [Payment sums][c-line-repo]. |
| Signed payment orders and complete payment evidence | Partial | Orders, lines, recipients, signature records, Booked restrictions and Excel exports exist. The current selected-order export is a list/report, not the complete signed voucher packet described in the archive guide or the prototype's rich payment report. [Order export][c-orders-ui], [signature model][c-signature]. |
| Budget revisions, agreement addenda and donor decisions | Partial | Multiple named budgets and audit history exist. No explicit revision chain, superseded/current-approved revision designation, or linked donor approval document was found. Contracts/addenda can be uploaded but have no dedicated workflow. [Budget][c-budget], [document][c-document]. |
| Document upload, download and central/cloud storage | Present foundation | Project uploads/downloads, employee attribution, validation and local/S3 storage implementations exist. Cloud deployment and recovery were not verified. Arbitrary server/cloud document links are not a finished end-user feature: the main screen builds a download URL from a stored file key. [Documents][c-doc-ui], [storage][c-s3]. |
| Document classification, versions, dates and archive checklist | Largely missing | Document stores project, employee, name/path and deletion data. No document date, category, draft/final state, revision relationship, required-evidence checklist, or financial-record link. The original MDB already had a document date. [Document][c-document]. |
| Project closeout and long-term archive | Not found as a workflow | No final-report donor-approval date, archive readiness check, physical archive location or retention review date. A Closed project status or soft delete cannot replace this process. [Project][c-project], archive guide and screenshot 4. |
| Memos and project images | Present | Dated project memos with employee/position and image captions/gallery are implemented. These are useful supporting records. [Memos][c-memo], [Project][c-project-ui]. |
| Calendar, annual plan, deadlines and responsible person | Not found | Screenshot 6 explicitly has date, note, author, assignee and completed flag. Current project/transaction dates and memos do not provide this work queue. |
| Trips: request, approval, itinerary, report and officer schedule | Not found as a workflow | Travel documents can be uploaded; no trip entity or travel approval/scheduling module was found. |
| Results reporting: SDGs, strategic goals, gender, climate and indicators | Partial foundation only | Sectors and portfolio counts exist. No objectives/indicators, targets, observed results, reporting periods or cross-cutting markers. Current Statistics is not a results-reporting module. [Statistics][c-statistics]. |
| Lessons learned, management responses and action points | Not found as a workflow | Memos can record prose, but no action owner, deadline, response status or follow-up completion. |
| Project risks | Not found | No structured risk register, mitigation, owner or review workflow. “Risk” in technical comments or general guidance is unrelated. |
| Outlook communication/calendar integration | Not found | No integration or sync implementation was found. Source scope needs clarification: calendar export, reminders, email filing and bidirectional sync are different features. |

## Most important findings

### 1. Documents need an archive structure and protected delivery

The archive guide asks for a recognisable project dossier: assessment, application, agreements/decisions, finance, correspondence, interim reports, travel, final report and other records. The illustrations confirm those nine sections and subfolders for approved applications, revisions, donor/partner contracts and payment directions.

Today a project has a flat file list. Users can upload a contract or audit report, but the system cannot tell whether it is a draft, an approved replacement, the final signed copy, or a missing prerequisite for closure. Files cannot be linked directly to a specific payment order or budget revision. There is no document timestamp in the model, despite `tblDokument.Datum` in the prototype.

There is a practical file-format gap as well: the current upload allowlist includes PDF and modern Office formats, but not ODT. The supplied Swedish source documents therefore cannot be uploaded in their original format. Decide whether to support ODT with appropriate validation or use an agreed PDF conversion process. This does not imply that Access database uploads or automatic Office conversion are required.

There is also a concrete access issue: [SecurityConfig][c-security] permits `/documents/**` and `/images/**` without authentication, and [AssetsController][c-assets] retrieves files by filename and sends public-cache headers without checking document/project access. The frontend links directly to these URLs. The local resource mapping also points into the frontend's public folders. This is source-code evidence, not a live internet-exposure test. It means authenticated metadata alone does not protect file content. Soft-deleting document metadata does not itself revoke the file URL. [WebConfig][c-web], [document service][c-doc-service].

Before storing confidential project records, serve private documents through authorized access and remove alternate public file paths. Define public project images separately if desired. S3 support by itself does not address application-level access.

A practical first archive slice is category, document date, authenticated upload time/actor and filtering, followed by explicit draft/final/replacement relationships and links to financial records. Preserve existing uploads. Do not implement automatic destruction merely because the guide discusses keeping final copies or removing duplicate payment attachments.

### 2. Add follow-up as work to be done, alongside history of work already done

The financial audit history answers **what changed, when, and by whom**. The requested calendar answers **what must happen next, who owns it, and whether it is overdue**. These are complementary features.

A small first slice could contain project, title/type, due date, assignee, status, completion date and an optional document link. Show upcoming/overdue items for the selected project and a cross-project “my follow-ups” list. Approval gates, travel and report schedules can build on that foundation after the missing IR follow-up list is supplied or its intended contents are agreed.

The specification's external project audit/revision, auditor reports and management response are also different from the application's change log. The completed audit phase remains valuable within its financial-record scope; it did not implement external audit case management. [Current audited entity types][c-audit].

### 3. Separate commitments from actual financial movements

The old reference shows a financier application/approval screen and separate planned/performed transaction sections. The prototype also has transaction kinds for incoming payment, outgoing payment, charging and rebooking.

Current Transactions is explicitly described as a **project funding record**. It is not a cash ledger. Payment-order lines reserve/use allocation capacity, but repository methods named `sumPaid...` sum active lines without filtering for bank execution, settlement date or a completed-payment record. This is useful commitment control; it does not establish money actually paid. [Operational guide][c-guide], [line sums][c-line-repo].

This distinction matters before implementing budget-versus-actual reports, refund reconciliation or donor balances. Agree separate definitions for approved budget, approved funding, planned allocations, committed orders, actual receipts/payments, refunds and remaining balance. Use explicit currency and direction, rather than assuming a negative amount or a status name supplies all those meanings.

There is likely terminology drift worth resolving: screenshot 3 displays **Andel** as the requested and approved financier **percentage share**. The prototype has `Andel1`/`Andel2`; today's guide describes first/second share as a funding split and the model stores entered amounts. This is strong evidence to revisit the meaning, not proof that the current business decision must be reversed. Do not automatically migrate those values as either percentages or instalments.

### 4. The budget formula matches, but exact workbook compatibility does not

On `Syria RRM`, H12 is `D12*E12*F12*G12`, with G12 stored as Excel's fractional percentage. This is equivalent to the application's units × frequency × unit price × allocated percent ÷ 100. I/J/K multiply local cost by the selected reporting/GBP/EUR rates in D7/D6/D8.

For example, row 12 is 1 × 3 × 175,000 × 15% = **78,750 TRY**, then × 0.315636 = **24,856.335 SEK**. The application's three-decimal output agrees with that example.

However, the original workbook's displayed whole numbers conceal higher precision:

| Workbook evidence | Current implementation | Consequence |
|---|---|---|
| D29 = 18886.97140940076 units | `noOfUnits` is Long; calculator requires integer ≥1 | Bread Bags cannot be entered exactly. Fractional quantities may be intentional planning values or spreadsheet balancing; clarify policy. |
| F23/F24/F27/F28/F29/F31/F32 have more than two decimals; F29 = 13.652165077301637 | Unit price permits at most two decimals | Seven of twenty primary cost rows require normalization or a precision change. Repeated quantity/frequency multiplication can magnify the difference. |
| G17:G20 store approximately one-third, shown as 33% | Allocated percent permits three decimals | 33.333% cannot exactly reproduce one-third. For row 17, using 33.333% produces 13,999.860 local rather than 14,000. |
| Excel retains intermediate precision and displays mostly whole amounts | Backend independently rounds each output to three decimals | Totals may differ even after choosing acceptable input precision. Define the reconciliation tolerance explicitly. |
| I32 = `H32*$D$7+1` | Uniform conversion formula | A one-unit reporting-only adjustment is not reproduced and should not be silently adopted. |
| B8 shows 7% IRW support, but F34/F35 are independent fixed 543348 inputs | Project support percentages are metadata; calculator uses cost-row inputs | The workbook does not establish an automatic overhead formula. Agree the base, exclusions and distribution before adding one. |
| Rows 38–39 split own contribution and donor contribution; rows 41–54 provide category-share and IRW/country-office summaries | Current budget export has grouped cost totals and a grand total | The specific financing and allocation summaries are missing. A transaction own-contribution flag is not the same as this reconciled budget summary. |

Eleven of the twenty primary cost rows contain at least one input outside the current exact precision/type contract. That is an input-compatibility finding, not a claim that eleven calculations are faulty.

Other source cautions: donor B3 is ECHO while row 39 says SIDA; D47 is a hardcoded 4,900,000 while I37's cached result is 4,899,999.962253409. No cached formula-error cells were found. These observations explain why copying the template literally would be a poor acceptance test.

The budget header `totalAmount` also remains independently entered; submission validates it is positive, not that it equals a selected currency's cost-row sum. Decide whether it is a ceiling, a donor-approved total, or a calculated total, and label its currency explicitly. Do not merge these concepts by assumption. [Cost model][c-cost], [calculator][c-calculator], [submission checks][c-budget-service], [budget header][c-budget-ui].

### 5. Formal revisions and project closure need explicit records

Audit history preserves financial edits but does not tell users “this is donor-approved revision 2, replacing revision 1, effective from this date.” Budgets have names but no revision family/current-approved marker. Approved budgets are deliberately locked; there is no formal revision workflow in the inspected code. The project snapshot loads and totals cost details from all active budgets, so treating additional budgets as replacement revisions would risk counting both. [Budget checks][c-budget-checks], [project snapshot][c-snapshot].

Before adding revisions, decide whether multiple budgets represent alternatives, cumulative funding, different currencies, or superseding versions. A revision slice should preserve the approved baseline, explicitly link its successor and donor approval evidence, and define which revision feeds totals.

For closure, record donor acceptance of the final report separately from operational end date and deletion. The archive guide starts its retention process from donor final-report approval and also requires physical records. Software can track readiness, dates and storage location; it cannot establish that the physical binder is complete or the archive room meets the policy.

### 6. Signature records are not a complete signing service

The implemented signatures have employee, status, text and date, with parent eligibility/Booked controls and redacted audit changes. This supports the prototype's attestation records. It does not demonstrate a cryptographic signature, identity verification by an external signing service, or that the named employee personally signed a particular immutable document. [Signature][c-signature], [signature UI][c-signature-ui].

For the archive guide, a signed PDF and its association with the order may be sufficient; for formal electronic signing, a separate requirement and design are needed. Do not introduce an external signing product before deciding which meaning is intended.

## What the prototype and screenshots specifically add

The supplied MDB contains these table families, all of which have recognisable modern counterparts:

- `tblProjekt`, `tblProjektStatus`: project and status.
- `tblOrganisation`, `tblOrgStatus`, `tblParnter`: organisations and project relationships.
- `tblAnställd`, `tblBefattningStatus`, `tblServicePers`: employees, positions and assignments.
- `tblBudget`, `tblValutaStatus`: budget and currency reference data.
- `tblTransaktion`, `tblTransStatus`: funding/transaction records and kinds.
- `tblUtbetalningsorder`, `tblUnderskrift`, `tblUnderskriftStatus`, `tbMottagare`: payment orders, attestations and recipients.
- `tblDokument`, `tblMemo`: project documents and notes.

The modern cost-detail/allocation/order-line structures add useful detail absent from those simple tables. Conversely, prototype fields needing explicit mapping include the second-language project title, document date, recipient date, financier reference and transaction reference, transaction-specific exchange rates, account-holder name and sort code. Some may be intentionally retired; do not fabricate replacements or claim lossless migration without a mapping decision.

The MDB's saved queries calculate currency equivalents (`CCur(amount*rate)`), filter funding records, and join recipient bank/organisation details and signatures into `qryUtbetalningsorder`. Its catalogue includes a payment-order report. Reading those SQL definitions establishes their intended data, not the report's rendered appearance or full behaviour. The Swedish text indexes emitted read-only collation warnings; schema, catalogue and query inspection still completed. No linked external database or macro was executed.

| Screenshot | Visible evidence | Current comparison |
|---|---|---|
| 1 — Huvudsida | Swedish/English titles, reference, dates, officer, country/region, type/theme/sector, target group and several partner roles | Core metadata is strong; language variants and several classifications remain missing or unstructured. |
| 2 — Projektbudget | Ordered budget lines, cost type, currency, rate, equivalent SEK and total | Modern unit-based budgeting is richer; current rates are configured per budget rather than independently per row. Confirm whether mixed local currencies inside one budget are necessary. |
| 3 — Finansiärer | Requested/approved amounts and currencies, exchange rates, percentage shares, own contribution and funding coverage | Partially represented by transactions; summary and currency semantics need definition. |
| 4 — Projektdokument | Agreement established, final-report deadline/receipt, finance balance check, external audit dates, final archive flag/location, document type/date/author/path | File upload exists; the surrounding closeout and evidence workflow largely does not. |
| 5 — Transaktioner | Separate planned/performed lists, transaction references/dates/currencies, balance, incoming/outgoing/rebooking/charging actions | Planning and orders exist; execution/refunds/reconciliation are not equivalent. |
| 6 — Kalendarium | Date, note, note author, assignee and completed flag | Clear missing functional slice. |
| 7 — Memo | Project notes | Covered by the current richer memo records. |

## Recommended sequence

This sequence is a recommendation, not an instruction to implement every item in the old draft.

1. **Protect document delivery before confidential use.** Authorized downloads, appropriate cache policy, and no bypass through public/static storage. Check unauthenticated access, authorized download and deleted-record access. Decide the intended project visibility policy rather than assuming membership restrictions already exist.
2. **Add the smallest useful archive structure.** Categories based on the nine-section guide, document date/upload metadata and category filtering. Then add draft/final/replacement linkage, financial-record attachments and archive completeness. This has direct support in both the specification and archive guide.
3. **Add project follow-ups.** Due date, owner, completion and upcoming/overdue views. Use this for report deadlines before building separate travel and annual-planning modules.
4. **Resolve financial semantics and workbook precision in a bounded slice.** Decide fractional units/price precision, first/second share meanings, currency of header totals and what “paid” means. Build representative workbook examples into acceptance tests after those decisions. These are small decisions with large downstream consequences.
5. **Add funding and actual-payment reporting.** Explicit receipts/payments/refunds and references, then funding coverage and budget-versus-actual views. Preserve existing commitment controls.
6. **Add formal budget revisions and project closeout.** Current approved revision, donor evidence, final-report acceptance, archive checklist and retention review date.
7. **Expand programme management when priorities are confirmed.** Risks, results/indicators, management-response actions and travel. Outlook integration comes after the internal workflow is stable.

For a demo-focused next feature, **document categories and metadata** is the clearest compact continuation. If the immediate objective is reproducing the RRM workbook, take the precision/financial-meaning decision first instead. Neither requires a redesign of the whole application.

## Limits and operational follow-through

- No whole-system completion percentage is assigned: the sources combine a small prototype, a broad draft specification and a later operational policy, without agreed weights or acceptance criteria.
- Existing financial audit coverage remains a substantial strength. Its enum covers eight financial entity types; it is not a universal history of project, document, memo, organisation or reference-data edits. Extend history alongside those workflows when needed.
- Browser testing reported by the user is useful context. This review did not independently verify every screen, permission, export or recovery path. Existing test-suite totals were not rerun and are not presented as new verification.
- The existing backend closeout report records a theme-column Hibernate/MySQL validation mismatch. This is a separate deployment-readiness issue, not a newly discovered missing business feature. Backup/recovery operations, storage retention and actual cloud configuration were outside this assessment. [Backend closeout][c-closeout].
- The source workbook and MDB were not imported into the application. A future import requires explicit mapping and reconciliation, particularly for retired fields, status meanings, currencies and numeric precision.


[spec]: <D:/Operationella dokument för bistånd/Databas project specification  (kopia).odt>
[archive]: <D:/Operationella dokument för bistånd/Arkivering (Internationella projekt) ny 2023_1.odt>
[screens]: <D:/Operationella dokument för bistånd/print screen exempel of hum. project database set up (1).odt>
[mdb]: <D:/Operationella dokument för bistånd/Kopia 7 av Only1_9186a8cd-fe74-4586-8b0f-beaad5df849b.mdb>
[xlsx]: <D:/Operationella dokument för bistånd/RRM 2024 .xlsx>
[c-project]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/Project.java:30>
[c-employees]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/EmployeeProject.java:15>
[c-org-rel]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/ProjectOrganization.java:16>
[c-bank]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/BankDetail.java:29>
[c-security]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/security/SecurityConfig.java:117>
[c-calculator]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/serviceImpl/CostCalculator.java:30>
[c-budget-checks]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/validation/BudgetLifecycleChecks.java:11>
[c-audit]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/AuditEntityType.java:3>
[c-project-service]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/serviceImpl/ProjectServiceImpl.java:125>
[c-transaction]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/Transaction.java:30>
[c-line-repo]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/repository/PaymentOrderLineRepository.java:20>
[c-signature]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/Signature.java:29>
[c-budget]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/Budget.java:30>
[c-document]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/Document.java:29>
[c-s3]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/storage/S3FileStorageService.java:18>
[c-memo]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/Memo.java:24>
[c-assets]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/controller/AssetsController.java:36>
[c-web]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/config/WebConfig.java:11>
[c-doc-service]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/serviceImpl/DocumentServiceImpl.java:124>
[c-cost]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/model/CostDetail.java:45>
[c-budget-service]: <D:/projects/relief_projects/src/main/java/io/github/dejanmarlovic/reliefprojects/relief_projects/serviceImpl/BudgetServiceImpl.java:315>
[c-closeout]: <D:/projects/relief_projects/docs/audit-closeout.md:97>
[c-layout]: <D:/projects/relief-projects/src/pages/Layout/Layout.module.scss:218>
[c-cost-style]: <D:/projects/relief-projects/src/pages/Budgets/Budget/CostDetails/CostDetails.module.scss:125>
[c-budget-ui]: <D:/projects/relief-projects/src/pages/Budgets/Budget/Budget.js:651>
[c-guide]: <D:/projects/relief-projects/src/pages/OperationalGuide/OperationalGuide.jsx:839>
[c-orders-ui]: <D:/projects/relief-projects/src/pages/PaymentsOrders/PaymentOrders.jsx:1012>
[c-doc-ui]: <D:/projects/relief-projects/src/pages/Documents/Documents.js:21>
[c-project-ui]: <D:/projects/relief-projects/src/pages/Project/Project.js:2700>
[c-statistics]: <D:/projects/relief-projects/src/pages/Statistics/Statistics.jsx:152>
[c-snapshot]: <D:/projects/relief-projects/src/pages/Project/ProjectSnapshot/ProjectSnapshot.jsx:222>
[c-signature-ui]: <D:/projects/relief-projects/src/pages/Signatures/Signature/Signature.js:79>
