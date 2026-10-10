// Training instructions use project codes, never environment-specific record IDs.
export const demoWalkthroughs = [
  {
    id: "demo-start", title: "Demo practice: before you begin",
    intro: "Fictional demo — for training and testing only. These walkthroughs describe the 10 October 2026 training edition. They become usable after your administrator installs the demo projects and files. This page does not confirm installation or reset any records.",
    steps: [
      "Find the project by its name and code in Project details. If the four projects below are missing, wait for installation; do not use a similarly named older test project.",
      "Ask your administrator to enable the training accounts you need. The manager prepares project work, Finance handles financial records, the reviewer makes independent decisions, and the custodian performs administrator actions.",
      "Read the starting example and download its supporting files before changing anything. Check the fictional label and make sure the file opens.",
      "Use a separate disposable training copy for exercises that change approved records, payments, results or closeout. Ask the administrator to prepare it; there is no project-copy or reset instruction on this page.",
      "After each exercise, explain in your own words what changed, who made the decision and what remains unconfirmed. Note confusing labels or unexpected results for review."
    ],
    notes: [
      ["People to practise with", "The dedicated accounts are demo.manager, demo.finance, demo.reviewer and demo.custodian. They need separately enabled access and individual passwords. Independent reviews require different Employee identities, not merely switching usernames. Do not connect these fictional users to Outlook."],
      ["Dates and repeated practice", "Dates stay fixed in this edition. Overdue labels will change as time passes. If a planned trip is now in the past, create a new future request for the approval exercise rather than rewriting its history. Refresh after changes and record your starting values; the figures below describe the original training edition."],
      ["Documents and photographs", "The edition contains 36 PDFs, five budget workbooks and two illustrative photographs. Workbooks support the budgets already recorded in the application; uploading one does not import its rows. Photos are illustrations, not proof of project activity. All money movements and decisions are fictional."],
      ["Use the right level of access", "Start with the named training role and read any explanation beside an unavailable action. Ask for help if the expected control is absent. A read-only user can practise reviewing and downloading permitted records but cannot perform the changes described below."]
    ]
  },
  {
    id: "demo-mozambique", title: "Practice A: prepare a household recovery project",
    intro: "Choose Demo — Riverplain household recovery, code DEMO-MZ-2026-01. This Mozambique example starts with a returned project assessment, a partner assessment submitted for review and a draft budget. It is the best place to practise preparation and independent decisions.",
    steps: [
      "As the manager, read the project description, intended households, language titles and operating country. In Documents, download Demo - Revised accessible distribution proposal.pdf and Demo - Needs and access assessment.pdf. Explain the need and the proposed delivery approach.",
      "Open Assessment and read the return reason and history. Use Demo - Committee return and review record.pdf to understand the concern. Improve the distribution and access explanation, explicitly select the appropriate evidence versions and submit.",
      "As the separate reviewer, refresh the assessment and review the submitted information. Record a decision and explanation using the actions offered. Check that history identifies the reviewer and that operational project status has not been treated as a funding decision.",
      "Open the partner relationship’s Assessment. Read Demo - Partner capacity assessment.pdf and consider capacity and suitability for this particular role. Record the independent outcome and explain any concerns.",
      "As Finance, open the draft budget and its six cost rows. Compare them with Demo - Draft household delivery plan.xlsx. The starting total is 19,800 USD, including 500 kits at 24 USD each, or 12,000 USD.",
      "In the disposable training copy, increase the draft limit to 20,000 USD and add an exercise cost with quantity 3, unit price 19.99, frequency 2 and charging share 25%. Check the added local amount is 29.985 USD and the new planned total is 19,829.985 USD. Complete the available budget submission, return, amendment and review steps with the appropriate roles.",
      "Practise a follow-up: start work, mark it Done, then confirm reopening. Review the related risk and explain why completing the task does not approve the project or its documents."
    ],
    notes: [
      ["Check the boundaries", "A contributor must not approve their own assessment. A language-title-only edit does not change its decision basis; changing the target group or operating countries can require review or resubmission. Try context changes only in the training copy and read the resulting warning."],
      ["Practise document versions", "Compare Demo - Project proposal.pdf with Demo - Revised accessible distribution proposal.pdf. Upload a clearly labelled exercise revision through Documents, then explicitly link it where needed. Earlier evidence should continue to identify its earlier version. Final status alone does not mean the checklist is complete."],
      ["Explain it back", "Can you explain the difference between a project assessment, a partner-role assessment and budget approval? Can you explain the kit total, the charging percentage and why the project still has no money merely because its budget is approved?"],
      ["Further practice", "Before financial records depend on a draft budget, inspect the offered currency-conversion preview in your training copy. Review the rates and resulting amounts before confirming. Do not change a bound budget just to reproduce this exercise."]
    ]
  },
  {
    id: "demo-malawi", title: "Practice B: follow funding through a revised plan",
    intro: "Choose Demo — Community water-point repair, code DEMO-MW-2026-02. This example connects a budget revision to one existing award, commitments, receipts, payments and returns. Start by reading; there are several different amounts with different meanings.",
    steps: [
      "Open the original and revised budgets and download Demo - Original water-point repair plan.xlsx and Demo - Revised accessible water-point plan.xlsx. The original plan is 20,000 USD; the revised plan is 21,000 USD. Explain the reduced parts estimate, increased transport and new accessible-apron cost.",
      "Read Revisions & donor decisions and Financial execution alongside Demo - Governing donor approval and addendum.pdf. Identify the current plan and the separately activated plan. Do not add the two budgets into a 41,000 USD plan.",
      "Open the original funding award. It approves 18,000 USD. Existing reservations total 14,500 USD, including 1,000 USD assigned to the new apron row, leaving 3,500 USD unused approved funding. The revision has not created a second award.",
      "Open funding receipts and Returns to financier. Compare the two receipt advices and Demo - Return to financier record.pdf: gross received is 18,000 USD, returned is 500 USD and net retained is 17,500 USD. Explain why that net figure does not increase the funding available to commit.",
      "Find the approved Booked order for Clearwell with 5,000 USD of commitments. Under Outgoing payments, inspect 3,000 and 1,500 USD payments and the retained correction history. Gross paid is 4,500 USD; a 200 USD recipient return gives net paid of 4,300 USD. The gross remaining comparison stays 500 USD.",
      "Open View / print payment-order report and compare it with the recorded figures. Download the payment and recipient-return evidence. Inspect Late payment evidence and the earlier and corrected combined files; they are outside the original approval decision.",
      "In your training copy, use Revision funding assignments to reduce the apron assignment from 1,000 to 800 USD with a reason. Unused funding should become 3,700 USD. The existing 600 USD commitment prevents reducing it below 600 USD. Inspect the separate editable order before trying any commitment changes."
    ],
    notes: [
      ["Practise returns carefully", "As Finance or an authorised administrator, record a small fictional return in the training copy against an original receipt or payment. Compare the remaining return limit before and after. A return larger than the original amount still available to return should be rejected. Do not void a genuine return to unlock its original entry."],
      ["Practise evidence and recipient checks", "Use the existing late-evidence replacement action with an exact selected version and a reason; inspect the retained history afterwards. On the editable order, review recipient eligibility. A change that removes the recipient’s last required positive contribution should be rejected. Booked order lines remain protected."],
      ["Practise risk review", "Open the spare-parts risk, read the mitigation and update it in your training copy. Close with a reason, then reopen before editing again. Compare these decisions with the separate follow-up board."],
      ["Explain it back", "Can you distinguish the 21,000 USD plan, 18,000 USD award, 17,500 USD net receipts and 4,300 USD net payments? None is automatically a bank balance. Why does a 200 USD return not authorise another payment?"],
      ["Further practice", "Compare the August and September progress documents. Reported household reach progresses from 320 to 410; it is not a total of 730. Review the original and replacement evidence versions before relying on either report."]
    ]
  },
  {
    id: "demo-moldova", title: "Practice C: understand corrections and unfinished work",
    intro: "Choose Demo — Winter learning continuity, code DEMO-MD-2026-03. This example shows why a correction, a management resolution and acceptance of a travel report do not all mean the same thing.",
    steps: [
      "Read the project story and Demo - Winter learning delivery plan.xlsx. The plan is 13,400 EUR and the approved award is 12,000 EUR. Open the payment order: commitments are 5,000 EUR, gross paid is 5,200 EUR and returned is 200 EUR. Net paid is 5,000 EUR, but the gross excess warning remains 200 EUR.",
      "Open Results and the learner-reach indicator. Compare Demo - Reported learner reach.pdf and Demo - Corrected learner reach.pdf. The reported 95 was corrected to 90 after duplicate attendance was identified. The earlier 70 and later 90 are not added together.",
      "Compare the report’s captured target of 120 with the current target of 130. In the training copy, correct a report with a reason and explicitly select its evidence. Check that the correction retains the earlier target rather than silently adopting 130.",
      "Open Findings & lessons and read Demo - Management response to attendance finding.pdf. Inspect the resolution, outstanding action and later review warning separately. Reopen in the training copy before changing the response, then review and resolve with an explanation for any unfinished work.",
      "Open Travel and inspect the partly completed visit alongside Demo - Curtailed visit report.pdf. Compare approved and actual dates and the independent report acceptance. Explain why the report does not change the original travel approval.",
      "With a manager and independent reviewer, practise an upcoming travel request while its departure is still in the future. If the seeded dates have passed, create a new future request. Read the Travel schedule and overlap warnings before review.",
      "Practise correcting a returned travel report in the training copy. Select the appropriate retained approval or honestly use the offered unapproved-plan choice. Record the concluded outcome, actual dates where applicable and explanation, then arrange independent report review."
    ],
    notes: [
      ["A reported excess is still visible", "The application records what staff say was paid, even when it exceeds commitments. A later return does not erase that gross comparison. Recording an excess is not permission to make an excess payment."],
      ["Resolution and completion differ", "Resolving a finding does not complete the linked task. A changed task can require management to review its earlier resolution. If creating a task succeeds but linking it fails, return and select that existing task instead of making a duplicate."],
      ["Partner roles differ too", "Inspect Clearwell’s assessment for its proposed role here and compare it with Malawi. A not-recommended outcome for one role does not globally disqualify the organisation."],
      ["Explain it back", "Why does the corrected result still show the old target? Why can management resolution coexist with unfinished work? What does acceptance of a partly completed travel report establish—and what does it leave unchanged?"]
    ]
  },
  {
    id: "demo-nepal", title: "Practice D: read a completed project and archive review",
    intro: "Choose Demo — Accessible learning spaces, code DEMO-NP-2016-04. This is a fictional historical example. Begin with inspection so the completed story remains available as a reference.",
    steps: [
      "Read the description and download Demo - Learning-space application and rationale.pdf and Demo - Completed learning-space plan.xlsx. The planned total is 11,000 USD.",
      "Compare the award, commitments, receipts and payments with Demo - Recorded movement summary.pdf. Each totals 11,000 USD in this example. Explain why matching figures are not proof of bank reconciliation or expenditure against each individual cost row.",
      "Read Demo - Final report and limitations.pdf and Demo - Donor final-report acceptance.pdf. Identify the acceptance date of 30 September 2016 and the limitations of the reported results.",
      "Open Project details → Closeout & archive. Inspect final-report acceptance, administrative closure and filing as separate decisions. Compare their references with Demo - Administrative closeout and archive inventory.pdf.",
      "Read the digital-storage review confirmation. Its ten-year review date is 30 September 2026, already overdue at the training edition’s reference date. Explain the donor-approval basis rather than calculating from the project end date.",
      "Only in the disposable training copy, reopen administratively and follow the permitted closure and filing steps. Inspect which earlier confirmations now need review. Reclosing alone should not silently reaffirm the digital-storage review; explicitly review the required basis."
    ],
    notes: [
      ["A review date is not a destruction date", "The record asks someone to review storage. It does not delete files, move paper records or settle the unresolved paper-storage policy. Filing references are human assertions that should be checked through the organisation’s process."],
      ["Check the limits of your view", "If your role cannot see some financial checks, closeout warning coverage can be incomplete. Do not interpret missing access as confirmation that there are no issues. Administrative closure also does not freeze all further project work."],
      ["Finish with a read-only review", "Using an appropriately enabled read-only account, inspect permitted project details, document downloads and exports. Review access should not allow editing. Open the exported files and compare labels and amounts with the application."],
      ["Explain it back", "Can you distinguish operational status, final-report acceptance, administrative closure, archive filing and storage review? Which statements are recorded decisions, and which still require checks outside the application?"]
    ]
  }
];
