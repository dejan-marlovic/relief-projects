import React from "react";
import { FiBookOpen, FiArrowUp } from "react-icons/fi";
import styles from "./OperationalGuide.module.scss";
import { demoWalkthroughs } from "./demoWalkthroughs";

// Keep the existing section anchors so saved guide links still work.
const sections = [
  {
    id: "start", title: "Start here: how the work fits together",
    intro: "Use this guide while you work. Choose a topic below, check the selected project, and follow the steps available to your role. You do not need to complete every topic for every project.",
    steps: [
      "Set up the project, its partners and the people responsible for the work.",
      "Prepare the project and partner assessments. Arrange an independent review where required.",
      "Plan the budget and record funding decisions. Record money received and money paid separately as those events occur.",
      "Keep documents, actions, risks, results and reports up to date throughout delivery.",
      "When ready, record final-report acceptance, administrative closeout and archive information as separate decisions."
    ],
    notes: [
      ["Different decisions answer different questions", "Project assessment approval does not approve a budget, grant donor funding or confirm a payment. Completing a follow-up does not approve a document. Read the label beside each decision to understand its purpose."],
      ["Your role and selected project", "Most pages show the project selected at the top. My follow-ups shows your assigned work across projects, and the travel schedule and Statistics also cover more than one project. Available actions depend on your role and the record’s current state. A missing button does not necessarily mean something is broken."],
      ["Practising safely", "Use records clearly marked Fictional demo — for training and testing only. All examples in this guide are fictional illustrations, not instructions to make a real payment. The Demo practice topics at the end explain the four training projects. Use them after your administrator has installed the demo edition."]
    ]
  },
  {
    id: "part-1", title: "Projects: describe the work and organise the team",
    intro: "A project brings together its plans, people, partners, documents and financial records. Start with a description that explains the need, who will benefit, what will happen and how you will know whether it helped.",
    steps: [
      "Open New Project. Enter the required name, identifying details, dates and other information shown in the form, then register the project.",
      "Select the project and open Project details to review or update it. Ordinary details save automatically after a short typing pause or when you leave a field. Wait for Saved before moving to another page; if saving fails, your edits remain available with a retry option.",
      "Use Language titles, target group & operating countries for the optional Swedish and English titles, intended participants and countries where activities will take place. These optional details save automatically too.",
      "Add the relevant sectors, related organisations and staff participants. Use memos for useful working notes.",
      "Add appropriate project pictures and captions. Check that an upload succeeded; saving project information and uploading a picture are separate actions. Captions save automatically after a short typing pause."
    ],
    notes: [
      ["Explain the project clearly", "Include the local context, planned activities, delivery responsibilities and main uncertainties. Keep the project name short enough to recognise in lists. The optional language titles supplement that name. Operating countries describe planned coverage; an empty selection means not recorded, rather than worldwide."],
      ["Changes can affect earlier assessments", "Changing the target group, operating countries or other assessed project information can require resubmission or review. Read the assessment warning before proceeding. Changing a supplementary language title alone does not change the assessment decision."],
      ["Pictures, removal and restoration", "For demo photographs, include the source, required credit and the caption Illustrative photo — not evidence of this fictional project. Removing a project hides it from ordinary work; it is not administrative closeout. Restoration, where available to an administrator, does not automatically reinstate withdrawn approvals."]
    ]
  },
  {
    id: "assessment", title: "Project assessment: prepare and review independently",
    intro: "Open Project work → Assessment for the selected project. This records the project’s initial internal assessment. It is separate from donor decisions and financial approval.",
    steps: [
      "Describe the rationale and need, feasibility and capacity, and risks. Add notes and a recommendation. You can save an incomplete draft, but submission needs the required information.",
      "Select the exact assessment and committee-document versions that support the proposal. Checklist links are not copied into the assessment automatically.",
      "Submit the assessment with an explanation. The submitted information and selected evidence are retained for the reviewer.",
      "An independent administrator or approver with an active Employee identity reviews the submission. The creator, submitter and contributors cannot approve their own work, even through another account.",
      "If corrections are needed, return or withdraw the submission before editing. Withdraw a recorded approval before correcting and submitting for a new decision."
    ],
    notes: [
      ["Read the warnings", "The reviewer must explain missing evidence where the form permits it. A changed project context may require resubmission. Linking a document does not verify its contents or committee signatures."],
      ["Understand the history", "History records who submitted, returned, withdrew or approved the assessment and why. Legacy Yes — no recorded decision means an older flag exists without a recorded assessment decision. It is not equivalent to a new approval."],
      ["After approval", "Recorded approval is informational: it does not grant funding or change the operational project status. Evidence added later remains outside the earlier approval’s evidence."]
    ]
  },
  {
    id: "part-7", title: "Organisations: link partners and assess their roles",
    intro: "An organisation can take part in several projects or hold different roles. Its contact and bank information belong to the organisation; an assessment concerns its particular role in a particular project.",
    steps: [
      "Open Organizations or the related organisations in Project details. Create or select the organisation and link it to the project with the appropriate role.",
      "Check its address and contact information. Staff with the appropriate finance permissions can maintain bank details. An organisation can have more than one account. On the Organizations page, use Edit to change existing details; organisation and role selections save automatically, and addresses and bank details save after a short typing pause or when you leave a field. Wait for Saved. New records still require Save, and linking or removing records remains an explicit action.",
      "Each organisation–role relationship has its own card. Use Show details for addresses, bank details and relationship editing. Choose Open assessment at the top of the card. Describe capacity, suitability for this role and material concerns, then select supporting documents from the same project.",
      "Submit for independent review. An eligible reviewer records the outcome and explanation; contributors cannot review their own submission.",
      "Review history and any warnings before relying on an earlier decision. Follow the withdrawal or correction actions offered if the assessment needs changing."
    ],
    notes: [
      ["Save work without recording a decision", "Assessment text saves to the project after a short typing pause; Save draft now is also available. Wait for Draft saved to the project. Unfinished evidence selections, review explanations and correction reasons are kept only in the current browser tab for your signed-in account. Close keeps that unfinished work; reopen the same action to recover it and check the current assessment before continuing. Closing the browser tab loses these local drafts. Linking evidence, submitting, recording a decision and withdrawing remain explicit actions. Discard unfinished entries removes the local draft, not text already saved to the project."],
      ["One organisation, different outcomes", "A partner may be suitable for local distribution in one project but unsuitable for a different technical role elsewhere. Assessments across projects and roles helps you compare those decisions; it does not give the organisation a universal approval."],
      ["Keep the assessed relationship intact", "Once assessment has started, do not repurpose that relationship for another organisation, project or role. Create a separate relationship. Deleting and restoring a relationship can require a fresh confirmation of the assessment."],
      ["Bank details are reference information", "Recording an account does not validate it or send money. Account numbers allow up to 50 characters and SWIFT up to 20. Follow your organisation’s checks before using real payment instructions. Demo banking details must be clearly non-operational."]
    ]
  },
  {
    id: "part-2", title: "Budgets: plan costs and explain changes",
    intro: "A budget describes planned costs. Its detailed rows explain the quantities, prices and assumptions behind the plan. Planned costs are separate from approved funding and money actually paid.",
    steps: [
      "Select the project and open Budgets. Create a budget with a meaningful name, description, local currency and the required rates and limit.",
      "Add cost details under the appropriate categories. Enter quantities, unit prices, frequency and the share charged to this project where applicable. Describe the unit clearly in the cost description.",
      "Review the calculated amounts and totals. Explain significant assumptions in the description or a supporting workbook. Check the direction of each currency rate.",
      "When the draft is ready, use the available submission and review actions. If returned, read the reason, amend the draft and submit again.",
      "For a changed approved plan, use Revisions & donor decisions. Review the copied costs, record the relevant donor decision and explicitly select the current plan as appropriate."
    ],
    notes: [
      ["A simple cost example", "Fictional demo: 100 kits at 25 USD each, once, charged entirely to the project, gives 2,500 USD. A 50% share gives 1,250 USD. Check the saved calculated amounts; totals may retain more precision than a short on-screen display."],
      ["A revised plan has separate steps", "Internal approval, donor approval, selection as the current plan and activation for financial use are separate. Open Financial execution within Revisions & donor decisions, review the activation preview and blockers, and confirm only when authorised. A revised plan does not move old financial records or create another funding award."],
      ["Changing currency and using Excel", "Use the offered currency-conversion preview and confirmation when eligible. Existing financial links can prevent conversion. Excel exports help review the plan; a supporting workbook does not itself create cost rows. This guide does not describe an Excel import feature."],
      ["When editing is unavailable", "Approved and submitted records have restrictions. Read the reason and use the appropriate return, revision or correction process. Do not delete an approved budget to bypass those restrictions."]
    ]
  },
  {
    id: "part-3", title: "Funding: record awards, receipts and returns",
    intro: "Open Transactions for the selected project. Here, a transaction describes funding requested or approved from a financier. It is not itself proof that money arrived.",
    steps: [
      "Create the funding record against the correct eligible budget and financier. Record the requested amount, planning information and other required fields.",
      "Use the available review workflow to record approved funding. Allocate amounts to eligible cost rows and check the displayed limits.",
      "When money arrives, open the funding record’s Details & activity and its funding receipts. Record the actual received date, amount, reference and explanation as appropriate.",
      "When money is actually returned to the financier, open the original receipt’s returns section. Record the returned amount, date, reason and any supporting evidence.",
      "If an entry was a mistake, use its correction or void action. Keep a genuine receipt or return recorded, even if money moved in the opposite direction later."
    ],
    notes: [
      ["Read gross, returned and net separately", "Fictional demo: receipts of 10,000 and 8,000 USD give 18,000 USD gross received. A 500 USD return gives 17,500 USD net retained. This does not change the approved award or establish the bank balance or available spending."],
      ["Use unused funding on an eligible revised row", "Open Revision funding assignments under the original award. Choose an eligible revised cost row and an amount within the displayed limit. Existing commitments can prevent a reduction. Keep the original award; do not create a duplicate simply to use a revised budget."],
      ["Returns belong to an original receipt", "The permitted return is limited by the amount not yet returned from that receipt. Genuine returns can prevent correction or voiding of their original receipt. If the displayed currency interpretation needs confirmation, review it carefully; confirmation does not verify historical bank activity."]
    ]
  },
  {
    id: "part-4", title: "Payment orders: commitments and money paid",
    intro: "Open Payment Orders under Finance. An order’s lines record commitments against funding and costs. Outgoing payments separately record money reported as paid to the recipient.",
    steps: [
      "Create an order and add eligible lines against the appropriate funding and cost rows. Select the organisations receiving those commitments.",
      "Check the recipient and its contribution to the order before submitting or approving. The order amount is calculated from its active lines.",
      "After the required approval, open Details & activity → Outgoing payments. Record money paid with its actual paid date, amount, reference and any explanation. This does not execute a bank transfer.",
      "If the recipient returns money, open Returned by recipient under the original payment and record the return and supporting evidence.",
      "Use View / print payment-order report to review the order, financial information and document index. Refresh the whole report before printing or saving a PDF."
    ],
    notes: [
      ["Commitment limits and payment warnings differ", "Commitment checks protect approved funding and cost limits. Actual payments can show an excess warning when reported payments exceed commitments. Recording that fact does not authorise an excess payment. Booked status does not prove that money was paid."],
      ["Understand a partial payment", "Fictional demo: a 5,000 USD recipient commitment with 4,500 USD paid leaves a gross comparison of 500 USD remaining. If the recipient returns 200 USD, net paid becomes 4,300 USD; the gross comparison stays unchanged. The return does not create permission to spend again."],
      ["Corrections and locked orders", "Use correction or void only for erroneous payment entries. Record genuine returned money as a return. Booked orders restrict header and line changes, while eligible payment and late-evidence actions may still be available. Recorded payments also protect their original recipient and order details."],
      ["What the report represents", "The report shows the current recorded information, not a retained certificate of approval or bank reconciliation. Its evidence index identifies file versions; it does not merge their contents. Recipient and whole-order comparisons describe the same payments, so do not add those totals together."]
    ]
  },
  {
    id: "part-5", title: "Signatures and Booked status",
    intro: "The Signatures page records signature information associated with payment orders. These records and an uploaded signed document serve different purposes.",
    steps: [
      "Select the correct project and order before recording signature information.",
      "Use the permitted status and details required by your organisation’s process. Review the existing entries first.",
      "Check the resulting order status. Booked orders have restrictions on changing their header and lines.",
      "If you have an externally prepared signed document, upload it in Documents and attach its exact version under the appropriate evidence section."
    ],
    notes: [
      ["Do not confuse records with verification", "A signature entry does not verify a handwritten or electronic signature, prove bank settlement or replace an independent assessment decision. Use the allowed correction process when information is wrong; do not change statuses merely to unlock another action."]
    ]
  },
  {
    id: "part-6", title: "Recipients: check who the order is for",
    intro: "A recipient identifies the organisation receiving an order’s payment. Its amount reflects the relevant commitments; it is not a separately entered record of money paid.",
    steps: [
      "Review the order’s lines and receiving organisations before creating or changing the recipient.",
      "Choose an eligible organisation with a positive contribution to the order. Check its recipient total against the whole-order total.",
      "If a change is rejected, inspect existing lines and payment history. Do not remove the recipient’s last qualifying contribution while it is still required.",
      "Record actual money paid in Outgoing payments on the payment order."
    ],
    notes: [
      ["Keep recipient and order totals distinct", "An order can contain commitments for more than one organisation. The whole-order remainder is not permission to pay that amount to the selected recipient. Once payments are recorded, changing the underlying recipient or order structure may be prohibited."]
    ]
  },
  {
    id: "part-8", title: "Documents: upload, select versions and retain evidence",
    intro: "Documents holds project files. A checklist, assessment, payment or report can refer to a specific version of one of those files. Uploading and linking are separate steps. When you edit a document’s category, date or Draft/Final label, changes save automatically. Wait for Saved before leaving. Lists and history refresh automatically while you are not editing, including when you return to the tab. Uploading, replacing files and saving checklist decisions still use their own buttons.",
    steps: [
      "Select the owning project and open Documents. Upload the file with a clear name and the appropriate category, document date and other details requested.",
      "Download the file to check it opens and contains what you intended. A successful metadata save alone does not prove the file is available.",
      "Return to the relevant checklist, assessment or financial record and explicitly select the supporting version.",
      "When a file changes, use the version workflow. Earlier links continue pointing to the earlier version; review which records should link to the new one.",
      "Read removed and unavailable evidence labels and retained history before correcting links. Removing an association does not delete the file."
    ],
    notes: [
      ["Checklist and document status", "A category describes a document’s kind; a checklist item describes why it is needed. Draft or Final labels and linked files do not certify completeness or approval. In each checklist card, save whether the requirement applies, then link evidence in that same card. New links are available only while the saved decision is Applicable and there are no unsaved decision changes. Existing links remain visible if the decision changes to Not applicable or Needs assessment."],
      ["Late payment evidence", "For an eligible approved order, including a Booked order, open Late payment evidence. Select the externally prepared signed order or combined evidence file and give a reason. Replacement and removal retain history. No outgoing payment entry is required, and these attachments remain outside the earlier approval decision."],
      ["Access and missing files", "Downloads require the appropriate access. A deleted or unavailable document may remain visible in history. Ask an authorised administrator about restoration instead of uploading a different file under an old version’s identity. Stay within the upload limits shown in the form."]
    ]
  },
  {
    id: "follow-ups", title: "Follow-ups: assign and complete work",
    intro: "Open Project work → Follow-ups. Selected project shows its actions; My follow-ups shows work assigned to your Employee identity across active projects.",
    steps: [
      "Create an action with a specific title, useful description, responsible person and deadline.",
      "Use the board to move work from To do to In progress and Done. Drag by the card’s handle or use the available action buttons.",
      "To reopen Done work, confirm the action. It returns to To do; start work separately if appropriate.",
      "Refresh and check filters and the pages within each column if you cannot find an action. Deadline warnings are separate from progress."
    ],
    notes: [
      ["Make the task useful", "Fictional demo: Confirm accessible collection routes. Describe who should check the routes, what information to obtain and when the outcome is needed. Marking this Done records completion of the task; it does not approve the project or satisfy a document checklist."],
      ["Calendar downloads", "Download calendar entry produces a snapshot you import yourself. Later edits, completion and deletion do not update that imported copy. Reimporting can create duplicates."],
      ["Outlook test preview", "Where configured, My follow-ups offers connection to your own Microsoft account. Initial publication is supported, but automatic updates and removals remain blocked. Use your Microsoft account’s calendar, which can be separate from a linked Google calendar. Manage outdated copies manually. Disconnect or Forget access does not remove those copies. Full synchronization work is paused."]
    ]
  },
  {
    id: "risks", title: "Risks: record concerns and mitigation",
    intro: "Open Project work → Risks to track what might affect delivery and what the team will do about it.",
    steps: [
      "Describe a specific risk, assign an owner and record the available likelihood and impact assessments.",
      "Explain the mitigation and choose a review date. Unknown or unassessed information should remain visibly unknown.",
      "Review and update the risk as circumstances change. Close it with a reason when appropriate.",
      "Reopen before making further changes to a closed risk. An authorised administrator can restore a deleted risk where permitted."
    ],
    notes: [
      ["Explain the response", "Fictional demo: delayed repair parts could postpone two sites. The mitigation is to confirm supplier lead times and review an alternative source. Likelihood and impact remain separate assessments; the system does not turn them into a verified risk score. Closing a risk does not automatically close the project."]
    ]
  },
  {
    id: "results", title: "Results: set targets and report progress",
    intro: "Open Project work → Results. An indicator defines what you intend to measure; each report records the result through a stated reporting date.",
    steps: [
      "Create the indicator with a clear definition, measurement type and unit, reporting period, direction and target. Record a known baseline or explicitly leave it unknown.",
      "Record a period-to-date value and its reporting date. Select supporting document versions where appropriate.",
      "Check the latest effective report and the target captured with it. Earlier reports remain available.",
      "Use Correct for an erroneous report and explain the change. Select the correction’s evidence explicitly. Use Void only when the entry should no longer count.",
      "When changing a target, explain why. Existing reports retain their earlier target; changing the current target does not rewrite them."
    ],
    notes: [
      ["Do not add cumulative reports", "Fictional demo: 320 households reported through August and 410 through September means the latest reported reach is 410, not 730. An unknown baseline is not zero."],
      ["Keep the measurement meaningful", "After reporting starts, some measurement details cannot be changed. Corrections preserve the earlier measurement basis. Values are reported observations, not independently verified outcomes, and different indicators should not be added into a universal project score."]
    ]
  },
  {
    id: "findings", title: "Findings and lessons: respond and follow through",
    intro: "Open Project work → Findings & lessons to record an observation, management’s response and the work linked to that response.",
    steps: [
      "Create a finding or lesson and explain its source and significance.",
      "Record a management response where needed. A lesson can remain without a response; this is different from an explicit No action required decision.",
      "Link existing follow-ups and supporting evidence. If a new task is needed, create it in Follow-ups, return and select it.",
      "Review the response and linked work before recording management resolution. Explain outstanding actions when the form requires it.",
      "If linked tasks later change, inspect the review warning. Reopen the management record before changing resolved content or associations."
    ],
    notes: [
      ["Resolved does not mean every task is Done", "Management can record a reasoned resolution while work remains outstanding. Task completion and management resolution are shown separately. Resolving a finding does not complete its tasks. If task creation succeeded but linking failed, select that existing task after refreshing rather than creating another."]
    ]
  },
  {
    id: "travel", title: "Travel: request approval and report the outcome",
    intro: "Travel approval concerns the planned trip. The later travel report explains what actually happened and has its own review.",
    steps: [
      "Open Travel for the project. Record the traveller, purpose, destination, planned dates and required supporting information.",
      "Submit before departure and arrange an independent review. Contributors cannot approve their own request. To change approved plans, use the withdrawal and resubmission process.",
      "Use Travel schedule to inspect planned trips across projects and overlap warnings. A schedule entry is not a reservation or booking.",
      "After the trip is concluded, report whether it was completed, partly completed or not taken. Select the retained approval or the offered unapproved-plan option honestly.",
      "Record actual dates where applicable, outcomes and explanations, then submit for independent report acceptance. Reopen an accepted report before correcting it."
    ],
    notes: [
      ["Plans and actual outcomes differ", "Fictional demo: an approved three-day visit ended after two days because a site was inaccessible. Report the actual dates and limitation as a partly completed trip. A trip not taken has no actual travel dates. Report acceptance does not retrospectively authorise travel."],
      ["Reading the schedule", "Review the full relevant period and all pages. Overlap warnings help planning but do not guarantee availability. When practising later, create a new future-dated request instead of trying to approve a historical trip."]
    ]
  },
  {
    id: "closeout", title: "Closeout and archive: record the final decisions",
    intro: "Open Closeout & archive in Project details. Final-report acceptance, administrative closure, filing and storage review describe different events.",
    steps: [
      "Review the final report and record its acceptance with the required information and evidence.",
      "Review the closeout warnings. Explain acknowledged issues and record administrative closure when authorised.",
      "Record the physical and digital filing references and the required archive information. Make references understandable to another member of staff.",
      "For digital storage review, confirm that the stated final-report acceptance represents the applicable donor-approval event. If the basis cannot be established, leave it unresolved with an explanation.",
      "After a relevant change or reopening, inspect the review warning. Reclosing and refiling alone do not reaffirm the earlier storage-review confirmation."
    ],
    notes: [
      ["Ten years means a review date", "The confirmed basis gives a ten-year digital-storage review date. It is not a destruction deadline. Paper-storage timing and transfer responsibilities still need an agreed process."],
      ["Closure is a recorded decision", "Administrative closure does not freeze the project, prove financial completion or verify that files were physically moved. If you cannot view some financial checks, the warning coverage is incomplete; that does not mean there are no issues."]
    ]
  },
  {
    id: "part-9", title: "Statistics, exports and checking your work",
    intro: "Statistics gives an overview across projects. Detailed pages, histories and exports help explain individual records and decisions.",
    steps: [
      "Check whether the view covers one selected project or the whole system, and review any filters.",
      "Read currency labels and whether a figure represents a plan, award, commitment, gross movement, return or net amount.",
      "Refresh before exporting or printing and inspect the resulting file. Use the payment-order report for a current order summary and evidence index.",
      "Use the relevant history to understand who made a decision, when it was recorded and why. Read older captured details separately from today’s information."
    ],
    notes: [
      ["Avoid misleading totals", "Do not add different currencies, both members of a revised budget family, or recipient and order comparisons of the same payments. Missing or unavailable amounts are not zero. Statistics does not independently verify project outcomes or reconcile bank balances."],
      ["When a save fails", "Read the message and keep your draft. Someone else may have changed the record, or a decision may now prevent editing. Refresh, inspect the current record and history, and review your changes before trying again. After an uncertain receipt, payment or task creation, check whether it already exists before creating another."],
      ["When an action is missing", "Check your role, selected project, Employee identity and the record’s state. Some actions require a different independent reviewer or a return, withdrawal or reopening first. Contact your administrator if access is incorrect; changing unrelated records is not a workaround."]
    ]
  }
];

const guideSections = [...sections, ...demoWalkthroughs];

const OperationalGuide = () => (
  <div className={styles.page} id="top">
    <div className={styles.shell}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderText}>
          <h1 className={styles.pageTitle}><FiBookOpen aria-hidden="true" /> Operational guide</h1>
          <p className={styles.pageSubtitle}>Everyday steps for planning, delivering and closing a project.</p>
        </div>
      </header>
      <div className={styles.layout}>
        <nav className={styles.toc} aria-label="Guide topics">
          <div className={styles.tocCard}>
            <div className={styles.tocTitle}>Choose a topic</div>
            <ul className={styles.tocList}>
              {guideSections.map(section => <li key={section.id}><a className={styles.tocLink} href={`#${section.id}`}>{section.title}</a></li>)}
            </ul>
          </div>
        </nav>
        <article className={styles.content} aria-label="Day-to-day instructions">
          {guideSections.map(section => (
            <section className={styles.part} id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              <p>{section.intro}</p>
              <ol>{section.steps.map(step => <li key={step}>{step}</li>)}</ol>
              {section.notes.map(([title, text]) => <div key={title}><h3>{title}</h3><p>{text}</p></div>)}
              <div className={styles.backToTop}><a href="#top" className={styles.backToTopLink}><FiArrowUp aria-hidden="true" /> Back to topics</a></div>
            </section>
          ))}
        </article>
      </div>
    </div>
  </div>
);

export default OperationalGuide;
