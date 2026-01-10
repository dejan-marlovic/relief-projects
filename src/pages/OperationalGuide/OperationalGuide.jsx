import React from "react";
import styles from "./OperationalGuide.module.scss";
import { FiBookOpen, FiArrowUp } from "react-icons/fi";

// Smooth scroll helper (adjust yOffset if you have a fixed/sticky header)
const scrollToHash = (hash) => {
  const id = hash?.replace("#", "");
  if (!id) return;

  const el = document.getElementById(id);
  if (!el) return;

  const yOffset = 12;
  const y = el.getBoundingClientRect().top + window.pageYOffset - yOffset;

  window.scrollTo({ top: y, behavior: "smooth" });
};

const TocLink = ({ href, children }) => {
  const handleClick = (e) => {
    e.preventDefault();
    if (typeof href === "string") {
      window.history.pushState(null, "", href);
      scrollToHash(href);
    }
  };

  return (
    <a className={styles.tocLink} href={href} onClick={handleClick}>
      {children}
    </a>
  );
};

const BackToTop = () => {
  const handleClick = (e) => {
    e.preventDefault();
    window.history.pushState(null, "", "#top");
    scrollToHash("#top");
  };

  return (
    <div className={styles.backToTop}>
      <a href="#top" className={styles.backToTopLink} onClick={handleClick}>
        <FiArrowUp /> Back to top
      </a>
    </div>
  );
};

const OperationalGuide = () => {
  return (
    <div className={styles.page} id="top">
      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>
              <FiBookOpen /> Relief Projects ERP — Operational Guide
            </h3>
            <p className={styles.pageSubtitle}>
              Non-technical, day-to-day instructions for using the ERP.
            </p>
          </div>
        </div>

        <div className={styles.layout}>
          {/* TOC */}
          <aside className={styles.toc} aria-label="Table of contents">
            <div className={styles.tocCard}>
              <div className={styles.tocTitle}>Table of contents</div>
              <ul className={styles.tocList}>
                <li>
                  <TocLink href="#part-1">Part 1: Projects</TocLink>
                </li>
                <li>
                  <TocLink href="#part-2">Part 2: Budgets</TocLink>
                </li>
                <li>
                  <TocLink href="#part-3">Part 3: Transactions</TocLink>
                </li>
                <li>
                  <TocLink href="#part-4">Part 4: Payment Orders</TocLink>
                </li>
                <li>
                  <TocLink href="#part-5">Part 5: Signatures</TocLink>
                </li>
                <li>
                  <TocLink href="#part-6">Part 6: Recipients</TocLink>
                </li>
                <li>
                  <TocLink href="#part-7">
                    Part 7: Related Organizations
                  </TocLink>
                </li>
                <li>
                  <TocLink href="#part-8">Part 8: Documents</TocLink>
                </li>
                <li>
                  <TocLink href="#part-9">Part 9: Statistics</TocLink>
                </li>
              </ul>
            </div>
          </aside>

          {/* CONTENT */}
          <article className={styles.content}>
            {/* ===================== */}
            {/* PART 1 */}
            {/* ===================== */}
            <section className={styles.part} id="part-1">
              <h2>
                Part 1: Projects — What They Are, How They’re Created, and How
                They’re Maintained
              </h2>

              <h3>What this document is for</h3>
              <p>
                This guide explains how the Projects part of the Relief Projects
                ERP is used in day-to-day work:
              </p>
              <ul>
                <li>What a project represents in the system</li>
                <li>How staff create a new project</li>
                <li>How staff update an existing project</li>
                <li>How staff attach images and captions</li>
                <li>
                  How staff connect sectors, partner organizations, team
                  members, and notes to a project
                </li>
              </ul>
              <p>
                Other areas (budgets, funding transactions, payments,
                signatures, documents, etc.) will be described later, but they
                all depend on projects being created and managed correctly.
              </p>

              <h3>1. What the system is trying to achieve</h3>
              <p>
                Relief Projects ERP is meant to help you manage relief projects
                in one place. In practice, a project is the “main folder” or
                “main case file” that everything else is attached to.
              </p>
              <p>A project holds:</p>
              <ul>
                <li>The project name and internal codes</li>
                <li>The project dates (planned and revised)</li>
                <li>The project type and status</li>
                <li>The location (if recorded)</li>
                <li>A short description</li>
                <li>Pictures (with captions)</li>
                <li>Which sectors the project belongs to</li>
                <li>
                  Which organizations are connected to the project (and what
                  role/status they have)
                </li>
                <li>
                  Which staff members are involved (and what role they have)
                </li>
                <li>Notes/memos related to the project</li>
              </ul>

              <h3>2. How people move around in the system</h3>
              <h4>Login</h4>
              <ul>
                <li>You must be logged in to use the system.</li>
                <li>
                  If the system sees you are not logged in, it will take you
                  back to the login page.
                </li>
              </ul>

              <h4>Tabs/pages</h4>
              <p>
                After login, you use the top navigation to move between areas
                like:
              </p>
              <ul>
                <li>Project</li>
                <li>Budgets</li>
                <li>Transactions</li>
                <li>Payments</li>
                <li>Signatures</li>
                <li>Recipients</li>
                <li>Documents</li>
                <li>Statistics</li>
                <li>Organizations</li>
                <li>New Project</li>
              </ul>
              <p>This document focuses on Project and New Project.</p>

              <h3>3. “Current project” — how the system keeps context</h3>
              <p>
                Most pages in the system assume you’re working on one project at
                a time.
              </p>
              <p>
                That’s why there is a project dropdown selector in the header:
              </p>
              <ul>
                <li>You choose the project once</li>
                <li>The rest of the system uses that project automatically</li>
                <li>
                  The system also remembers your last chosen project, so when
                  you open the app again, it tries to keep you on the same one
                </li>
              </ul>

              <h4>When the project selector is hidden</h4>
              <p>The project dropdown is not shown on:</p>
              <ul>
                <li>New Project (because you are creating a new one)</li>
                <li>
                  Statistics (all the projects are shown as part of Statistics)
                </li>
              </ul>

              <h3>4. Registering a new project (New Project page)</h3>
              <h4>What this is used for</h4>
              <p>
                You use New Project when a project is starting or needs to be
                entered into the system for the first time.
              </p>

              <h4>What you fill in</h4>
              <p>The New Project screen is divided into practical sections:</p>

              <h5>A) Core details (identity)</h5>
              <ul>
                <li>Project Name (required)</li>
                <li>Project Code (required)</li>
                <li>Reference number (optional)</li>
                <li>Pin code (optional)</li>
                <li>Support cost percentages (optional settings)</li>
              </ul>

              <h5>B) Classification (how the project is categorized)</h5>
              <ul>
                <li>Project Status (required)</li>
                <li>Project Type (required)</li>
                <li>Address (optional)</li>
                <li>Project duration in months (optional)</li>
                <li>
                  “Part of project” (optional — if it belongs under another
                  project)
                </li>
              </ul>

              <h5>C) Dates (timeline)</h5>
              <ul>
                <li>
                  Project Date (required — when it was created/registered)
                </li>
                <li>Project Start (required)</li>
                <li>Project End (required)</li>
                <li>Revised Start/End (optional — if timeline changes)</li>
              </ul>

              <h5>D) Cover image (optional)</h5>
              <ul>
                <li>
                  You can choose an image to represent the project visually
                </li>
                <li>The system shows a preview</li>
                <li>
                  The image is uploaded after the project has been created
                </li>
              </ul>

              <h5>E) Description (optional)</h5>
              <p>A short written summary</p>

              <h3>5. What happens when you press “Register”</h3>
              <p>When you press Register, the system does two things:</p>

              <h4>Step 1 — Create the project record</h4>
              <p>
                The project is created first with the information you entered.
              </p>
              <p>If something is wrong:</p>
              <ul>
                <li>the system highlights the field</li>
                <li>and shows a message explaining what to fix</li>
              </ul>
              <p>Examples of things that can block creation:</p>
              <ul>
                <li>missing required fields</li>
                <li>project name already exists</li>
                <li>project code already exists</li>
              </ul>

              <h4>Step 2 — Upload the cover image (only if you picked one)</h4>
              <p>If you selected a cover image:</p>
              <ul>
                <li>
                  the system uploads it after the project has been successfully
                  created
                </li>
              </ul>
              <p>If the image upload fails:</p>
              <ul>
                <li>the project still exists</li>
                <li>
                  the system shows an upload error so you can try again later
                  from the Project screen
                </li>
              </ul>
              <p>After success:</p>
              <ul>
                <li>the system shows “Project created successfully!”</li>
                <li>
                  the project becomes available in the project dropdown list
                </li>
                <li>the form resets</li>
              </ul>

              <h3>
                6. Viewing and updating an existing project (Project page)
              </h3>
              <p>
                The Project page is your operational “project file” where you
                can:
              </p>
              <ul>
                <li>review details</li>
                <li>update them when things change</li>
                <li>attach and manage pictures</li>
                <li>assign sectors</li>
                <li>connect organizations</li>
                <li>add staff participants</li>
                <li>write and manage notes</li>
              </ul>
              <p>
                When you select a project from the dropdown, this page loads the
                project’s data.
              </p>

              <h3>7. Editing project information (Project page)</h3>
              <h4>Changing fields</h4>
              <p>You can edit fields such as:</p>
              <ul>
                <li>name, codes, reference number</li>
                <li>status and type</li>
                <li>dates</li>
                <li>description</li>
                <li>support cost percentages</li>
                <li>address</li>
                <li>parent project (if applicable)</li>
              </ul>

              <h4>Saving changes</h4>
              <p>When you click Save:</p>
              <ul>
                <li>the system stores your changes</li>
                <li>
                  if something is wrong, the system shows errors and highlights
                  the problematic fields
                </li>
              </ul>

              <h4>Deleting a project</h4>
              <p>When you click Delete:</p>
              <ul>
                <li>the project is removed from active use in the system</li>
                <li>
                  linked items that belong to the project are also removed from
                  active use (for example: assigned sectors, linked
                  organizations, and team members)
                </li>
              </ul>
              <p>
                This is meant to prevent “orphaned links” staying active after a
                project is removed.
              </p>

              <h3>8. Cover images and captions (Project page)</h3>
              <h4>What cover images are for</h4>
              <p>
                Cover images help staff recognize the project quickly (for
                example):
              </p>
              <ul>
                <li>a map photo</li>
                <li>a site photo</li>
                <li>a logo</li>
                <li>a key document scan</li>
                <li>beneficiary photo evidence (depending on policy)</li>
              </ul>

              <h4>Multiple images</h4>
              <ul>
                <li>A project can have more than one image:</li>
                <li>you can scroll through them as a slideshow</li>
                <li>you can zoom an image to view it larger</li>
                <li>you can delete individual images</li>
              </ul>

              <h4>Captions</h4>
              <ul>
                <li>Each image can have a caption:</li>
                <li>captions are tied to the image you’re currently viewing</li>
                <li>captions are saved when you press Save</li>
                <li>
                  the caption appears under the image in zoom view if written
                </li>
              </ul>

              <h3>9. Sectors (Project classification)</h3>
              <h4>What this is for</h4>
              <p>
                Sectors are used to classify the project (for example: Health,
                Shelter, WASH).
              </p>
              <h4>How it is used</h4>
              <ul>
                <li>You tick sectors to add them to the project</li>
                <li>
                  You can remove a sector instantly by clicking the “x” on its
                  label
                </li>
                <li>The selected sectors help later reporting and filtering</li>
              </ul>

              <h3>
                10. Related organizations (partners, donors, stakeholders)
              </h3>
              <h4>What this is for</h4>
              <p>
                Projects are connected to organizations, and each connection has
                a meaning (status).
              </p>
              <p>Example:</p>
              <ul>
                <li>donor</li>
                <li>implementing partner</li>
                <li>local authority</li>
                <li>vendor</li>
                <li>stakeholder (depending on your configured statuses)</li>
              </ul>

              <h4>How it is used</h4>
              <ul>
                <li>Choose an organization</li>
                <li>Choose a status for that organization</li>
                <li>Click Add</li>
                <li>
                  The organization appears in the project list with its status
                </li>
                <li>You can remove it anytime</li>
              </ul>
              <p>
                This helps ensure the project file shows “who is involved” and
                “in what capacity”.
              </p>

              <h3>11. Project participants (staff working on the project)</h3>
              <h4>What this is for</h4>
              <p>
                Projects need a clear list of involved staff, along with their
                roles.
              </p>
              <h4>How it is used</h4>
              <ul>
                <li>Select an employee</li>
                <li>
                  The system automatically uses the role already stored for that
                  employee
                </li>
                <li>Click Add</li>
                <li>The employee appears as a participant</li>
                <li>You can remove them anytime</li>
                <li>
                  Employees already added won’t appear again in the dropdown,
                  preventing duplicates
                </li>
              </ul>

              <h3>12. Memos (project notes)</h3>
              <h4>What memos are for</h4>
              <p>Memos are short internal notes tied to the project.</p>
              <p>Examples:</p>
              <ul>
                <li>operational decisions</li>
                <li>meeting outcomes</li>
                <li>reminders</li>
                <li>field updates</li>
                <li>approvals in progress</li>
              </ul>

              <h4>How it is used</h4>
              <p>You can create a new memo. Each memo includes:</p>
              <ul>
                <li>a text message</li>
                <li>a date</li>
                <li>who wrote it (employee)</li>
                <li>what role they had (position)</li>
              </ul>
              <p>You can edit or delete memos later.</p>
              <p>
                Memos are always shown only for the currently selected project.
              </p>

              <h3>13. Practical operational rules (summary)</h3>
              <ul>
                <li>
                  <strong>
                    Rule 1 — Create projects before doing anything else
                  </strong>
                  <br />
                  Budgets, transactions, payments, signatures and reports all
                  depend on a project existing first.
                </li>
                <li>
                  <strong>
                    Rule 2 — Use the project dropdown to avoid mistakes
                  </strong>
                  <br />
                  Always confirm the selected project before entering data in
                  other tabs.
                </li>
                <li>
                  <strong>
                    Rule 3 — Keep project identity fields consistent
                  </strong>
                  <br />
                  Project name and project code must be unique so the
                  organization can reference them reliably.
                </li>
                <li>
                  <strong>
                    Rule 4 — Use sectors and organization links for reporting
                    clarity
                  </strong>
                  <br />
                  These links make reporting and oversight easier later.
                </li>
                <li>
                  <strong>
                    Rule 5 — Use memos for operational traceability
                  </strong>
                  <br />
                  Memos help explain “why something happened” later.
                </li>
              </ul>

              <BackToTop />
            </section>

            {/* ===================== */}
            {/* PART 2 */}
            {/* ===================== */}
            <section className={styles.part} id="part-2">
              <h2>
                Part 2: Budgets — What They Are, How They’re Created, and How
                They’re Maintained
              </h2>

              <h3>What the Budgets module is for</h3>
              <p>A Budget is the project’s “money plan”. It answers:</p>
              <ul>
                <li>How much money is planned in total?</li>
                <li>
                  In what currency is the project spending? (local currency)
                </li>
                <li>
                  How do we translate that into reporting currencies (SEK, EUR,
                  and GBP)?
                </li>
                <li>
                  What are the detailed cost lines that make up the budget?
                  (cost details)
                </li>
              </ul>

              <p>So the module has two levels:</p>
              <h4>Budget header (the main budget)</h4>
              <ul>
                <li>Description</li>
                <li>Total amount</li>
                <li>Date it was prepared</li>
                <li>Local currency (like USD, LBP, ETB…)</li>
                <li>The chosen exchange rates to convert into SEK, EUR, GBP</li>
              </ul>

              <h4>Cost details (the breakdown)</h4>
              <ul>
                <li>
                  A list of items like: rent, salaries, supplies, transport,
                  etc.
                </li>
                <li>
                  Each row calculates amounts in multiple currencies using the
                  budget’s exchange rates
                </li>
              </ul>

              <h3>How a user uses Budgets</h3>
              <h4>1) Select a project</h4>
              <p>
                Budgets always belong to a project. So the system first checks:
                which project is currently selected.
              </p>
              <p>If no project is selected:</p>
              <ul>
                <li>
                  It shows a message like “Select a project to see budgets”
                </li>
                <li>The “New Budget” button stays disabled</li>
              </ul>

              <h4>2) Create a new budget</h4>
              <p>User clicks New Budget and fills in:</p>
              <ul>
                <li>A short description (optional)</li>
                <li>Preparation date (optional)</li>
                <li>Total amount (required)</li>
                <li>Local currency (required)</li>
                <li>Local → GBP rate (required)</li>
                <li>Local → SEK rate (required)</li>
                <li>Local → EUR rate (required)</li>
              </ul>
              <p>When they press Create budget:</p>
              <ul>
                <li>The budget is saved</li>
                <li>It is added to the list immediately</li>
              </ul>
              <p>
                Important behavior: When the user changes the local currency,
                the system clears the exchange rate fields automatically because
                the old rates may no longer make sense.
              </p>

              <h4>3) Update an existing budget</h4>
              <p>In the budget screen the user can change:</p>
              <ul>
                <li>Description</li>
                <li>Total amount</li>
                <li>Preparation date</li>
                <li>Local currency</li>
                <li>Exchange rates</li>
              </ul>
              <p>When they press Save changes:</p>
              <ul>
                <li>
                  The system checks the form (basic “is everything filled in
                  correctly?”)
                </li>
                <li>It saves the updated budget</li>
                <li>
                  Then it recalculates cost details amounts using the updated
                  rates
                </li>
              </ul>

              <h4>4) Delete a budget</h4>
              <p>When the user clicks Delete budget:</p>
              <ul>
                <li>They get a confirmation prompt</li>
                <li>The budget is not fully erased</li>
                <li>
                  Instead it is marked as deleted and hidden from the normal
                  list
                </li>
              </ul>
              <p>Also important:</p>
              <ul>
                <li>
                  When a budget is deleted, all its cost details are also hidden
                  so they don’t remain floating around.
                </li>
              </ul>

              <h3>What “soft delete” means</h3>
              <p>Instead of removing budgets forever, the system:</p>
              <ul>
                <li>marks it as deleted</li>
                <li>records the deletion time</li>
                <li>hides it from normal “active budgets” views</li>
              </ul>
              <p>This is useful because:</p>
              <ul>
                <li>you can keep history</li>
                <li>you avoid accidentally losing data</li>
                <li>reports and checks stay possible</li>
              </ul>
              <p>Same rule applies to Cost Detail items.</p>

              <h3>What the Budget header controls</h3>
              <p>The budget header is like the “settings” for the breakdown:</p>
              <ul>
                <li>
                  Local currency (the currency the project is using in the
                  field)
                </li>
                <li>Exchange rates (local → SEK, EUR, GBP)</li>
              </ul>
              <p>
                When cost details are calculated, these rates are used
                automatically.
              </p>

              <h3>What Cost Details are</h3>
              <p>
                Cost Details are the line items inside a budget. Each row can
                represent:
              </p>
              <ul>
                <li>Office rent</li>
                <li>Staff salary</li>
                <li>Fuel</li>
                <li>Hygiene kits</li>
                <li>Truck rental</li>
                <li>Training sessions</li>
                <li>etc.</li>
              </ul>

              <p>Each row contains:</p>
              <ul>
                <li>Description</li>
                <li>Type (high-level group)</li>
                <li>Category (more specific)</li>
                <li>Units</li>
                <li>Unit price</li>
                <li>% charged (extra percentage)</li>
              </ul>

              <p>Then the system calculates:</p>
              <ul>
                <li>Local amount</li>
                <li>Amount in SEK</li>
                <li>Amount in GBP</li>
                <li>Amount in EUR</li>
              </ul>

              <p>
                Key idea: Cost details follow whatever exchange rates you
                selected in the budget header.
              </p>

              <h3>How cost detail amounts are calculated</h3>
              <p>For each row:</p>
              <ul>
                <li>Step A: base amount = units × unit price</li>
                <li>Step B: apply percentage charged</li>
                <li>
                  If percent charged is 10%, you pay 10% extra → base × (1 +
                  percent/100)
                </li>
                <li>
                  Step C: convert using budget’s exchange rates (to SEK/EUR/GBP)
                </li>
              </ul>

              <h3>How the Budgets page works</h3>
              <p>This screen:</p>
              <ul>
                <li>shows budgets for the selected project</li>
                <li>provides the New Budget button</li>
                <li>opens the Create form when requested</li>
              </ul>
              <p>It keeps the budget list up to date:</p>
              <ul>
                <li>after creating a budget → adds it to the list</li>
                <li>after editing a budget → replaces the updated one</li>
                <li>after deleting a budget → removes it from the list</li>
              </ul>

              <h3>How Cost Details works</h3>
              <p>The breakdown table supports:</p>
              <ul>
                <li>viewing cost lines grouped by type and category</li>
                <li>editing a row</li>
                <li>adding a new row</li>
                <li>deleting a row</li>
              </ul>
              <p>
                It also calculates and shows totals per category (Local, SEK,
                GBP, EUR).
              </p>
              <p>Usability detail:</p>
              <ul>
                <li>
                  if you edit an existing row, it can save when you click away
                </li>
                <li>
                  if you create a new row, it requires all required fields
                  before saving
                </li>
              </ul>

              <h3>What the system guarantees</h3>
              <p>
                Even if the screen tries to help the user, the system still
                enforces rules like:
              </p>
              <ul>
                <li>every budget must belong to a project</li>
                <li>total amount must be greater than 0</li>
                <li>local currency must be present</li>
                <li>key exchange rates must be selected</li>
                <li>deleted items are hidden from normal working lists</li>
              </ul>

              <h3>Quick user guide summary</h3>
              <p>To manage budgets:</p>
              <ul>
                <li>Select project</li>
                <li>Create budget header (currency + exchange rates)</li>
                <li>Add cost details (rows)</li>
                <li>Update exchange rates if needed</li>
                <li>Save budget → cost rows update automatically</li>
                <li>Delete budget if needed (it’s hidden, not destroyed)</li>
              </ul>

              <BackToTop />
            </section>

            {/* ===================== */}
            {/* PART 3 */}
            {/* ===================== */}
            <section className={styles.part} id="part-3">
              <h2>
                Part 3: Transactions — What They Are, How They’re Created, and
                How They’re Maintained
              </h2>

              <h3>What this section is for</h3>
              <p>This section explains:</p>
              <ul>
                <li>What a transaction represents</li>
                <li>How staff create and update transactions</li>
                <li>How staff delete a transaction (soft delete)</li>
                <li>How planned allocations work under a transaction</li>
              </ul>
              <p>
                Budgets and cost details must already exist, because
                transactions depend on them.
              </p>

              <h3>1. What a transaction is</h3>
              <p>
                A Transaction is a project funding record. It represents a
                planned funding action tied to a project and budget, such as:
              </p>
              <ul>
                <li>“This financier is providing money for this project”</li>
                <li>“This amount was applied for”</li>
                <li>“This amount was approved”</li>
                <li>
                  “The funding is split into first share and second share”
                </li>
                <li>“This is the planned date”</li>
                <li>“This is the current transaction status”</li>
              </ul>
              <p>
                A transaction is not a payment instruction by itself. Payments
                and payment orders come later.
              </p>

              <h3>2. What a transaction contains</h3>
              <h4>A) Ownership and linkage</h4>
              <ul>
                <li>Organization (internal owner)</li>
                <li>Project</li>
                <li>Budget</li>
                <li>Financier organization</li>
                <li>Transaction status</li>
              </ul>

              <h4>B) Amounts and planning fields</h4>
              <ul>
                <li>Applied for amount</li>
                <li>Approved amount</li>
                <li>First share amount</li>
                <li>Second share amount</li>
                <li>Own contribution (Yes/No)</li>
                <li>Date planned</li>
                <li>OK status (Yes/No)</li>
              </ul>

              <h4>C) Deletion tracking (soft delete)</h4>
              <ul>
                <li>is_deleted</li>
                <li>deleted_at</li>
              </ul>

              <h3>3. The most important rule: budget controls the project</h3>
              <p>
                Transactions are tied to a budget. The budget is treated as the
                “source of truth” for the project relationship.
              </p>
              <p>So the system enforces:</p>
              <ul>
                <li>Budget is required</li>
                <li>The chosen budget must belong to the selected project</li>
                <li>
                  The system prevents cross-project mistakes and shows an error
                  explaining the mismatch
                </li>
              </ul>

              <h3>4. How the Transactions page works</h3>
              <ul>
                <li>Select a project</li>
                <li>
                  The system loads transactions for that project (only active,
                  non-deleted ones)
                </li>
                <li>
                  Transactions are shown in an operational table with edit
                  actions and key fields (and optional hide/show columns)
                </li>
              </ul>

              <h3>5. Creating a new transaction</h3>
              <h4>What staff do:</h4>
              <ul>
                <li>Click New</li>
                <li>Fill in the fields (budget is required)</li>
                <li>Click Save</li>
              </ul>

              <h4>What the system does:</h4>
              <ul>
                <li>Creates the transaction record from the form values</li>
                <li>
                  Checks that the chosen budget belongs to the current project
                </li>
                <li>Stores the transaction under the correct project</li>
                <li>
                  Shows validation messages if fields are missing or incorrect
                </li>
              </ul>

              <h3>6. Updating an existing transaction</h3>
              <ul>
                <li>Click edit on a transaction row</li>
                <li>Change fields</li>
                <li>Save</li>
                <li>
                  If you change the budget, the system re-checks project
                  consistency and prevents invalid combinations.
                </li>
              </ul>

              <h3>7. Deleting a transaction (soft delete)</h3>
              <p>
                When a transaction is deleted, it is not removed permanently.
                The system:
              </p>
              <ul>
                <li>marks it as deleted</li>
                <li>records the deletion time</li>
                <li>hides it from normal working lists</li>
              </ul>

              <h3>Cost allocations under a transaction</h3>
              <h4>8. What cost allocations are</h4>
              <p>
                Cost allocations are the planned split of a transaction into
                cost details.
              </p>

              <h4>9. Key behavior: multiple allocation rows are allowed</h4>
              <p>
                You can allocate multiple rows to the same cost detail if
                needed. Allocations are treated as separate rows.
              </p>

              <h4>10. Allocation rules the system enforces</h4>
              <ul>
                <li>Same project requirement</li>
                <li>
                  Transaction cap (planned allocations must not exceed approved
                  amount)
                </li>
                <li>
                  Cost detail cap (allocations across transactions must not
                  exceed budgeted amount)
                </li>
                <li>
                  Paid safety rule (cannot reduce planned allocations below what
                  is already paid)
                </li>
              </ul>

              <h4>11. How the allocation panel works</h4>
              <ul>
                <li>When you expand a transaction row:</li>
                <li>you see planned allocations</li>
                <li>
                  you can add/update/delete allocation rows (within the rules)
                </li>
                <li>the panel shows Allocated / Approved / Remaining</li>
              </ul>

              <h4>12. Practical operational rules (summary)</h4>
              <ul>
                <li>Projects must exist first</li>
                <li>Budgets must exist first</li>
                <li>Budget and project must match</li>
                <li>Allocations must stay inside limits</li>
                <li>Payments protect allocations (paid safety rule)</li>
              </ul>

              <BackToTop />
            </section>

            {/* ===================== */}
            {/* PART 4 */}
            {/* ===================== */}
            <section className={styles.part} id="part-4">
              <h2>
                Part 4: Payment Orders — What They Are, How They’re Created, and
                How They’re Maintained
              </h2>

              <h3>What this section is for</h3>
              <p>This section explains:</p>
              <ul>
                <li>what a payment order represents</li>
                <li>how staff create and update a payment order header</li>
                <li>how staff add/edit/delete payment order lines</li>
                <li>
                  how locking works when a payment order is Booked (final
                  signature)
                </li>
                <li>
                  what rules prevent payments from exceeding approvals and
                  allocations
                </li>
              </ul>
              <p>
                Payment orders rely on projects, transactions, budgets, cost
                details, and signatures.
              </p>

              <h3>1. What a payment order is</h3>
              <p>
                A Payment Order is a controlled “payment pack”. It groups one or
                more payments so they can be tracked, reviewed, and (later)
                signed/booked.
              </p>
              <p>A payment order has two layers:</p>

              <h4>A) Payment order header (the “cover page”)</h4>
              <ul>
                <li>
                  Header transaction (optional — if blank, every line must
                  choose a transaction)
                </li>
                <li>Payment order date (required)</li>
                <li>Description (required)</li>
                <li>Message (required)</li>
                <li>Pin code (required)</li>
              </ul>
              <p>Important operational point:</p>
              <ul>
                <li>the header does not store a manual total</li>
                <li>the total is calculated from the payment lines</li>
              </ul>

              <h4>B) Payment order lines (the payments)</h4>
              <p>Each line is one payment entry:</p>
              <ul>
                <li>Organization (required)</li>
                <li>Amount (required, must be greater than 0)</li>
                <li>Cost detail (required)</li>
                <li>Transaction override (optional)</li>
                <li>Memo (optional)</li>
              </ul>

              <h3>2. How payment orders belong to a project</h3>
              <p>
                Payment orders are shown per project. A payment order is treated
                as belonging to the current project if:
              </p>
              <ul>
                <li>the header transaction belongs to the project, or</li>
                <li>
                  at least one line uses a transaction that belongs to the
                  project
                </li>
              </ul>
              <p>This matters because:</p>
              <ul>
                <li>the header transaction can be left empty</li>
                <li>
                  each line is allowed to use a different transaction if needed
                </li>
              </ul>
              <p>
                So the “project link” can come from the header or from the
                lines.
              </p>

              <h3>3. How the Payment Orders page works</h3>
              <ul>
                <li>Select a project</li>
                <li>
                  Review payment orders in a table (ID, transaction, date,
                  description, calculated amount, message, pin code)
                </li>
                <li>
                  Expand a payment order to manage its lines (where actual
                  payments are entered)
                </li>
              </ul>

              <h3>4. Creating a payment order (header)</h3>
              <p>Click New and fill in:</p>
              <ul>
                <li>Transaction (optional, but recommended)</li>
                <li>Payment order date (required)</li>
                <li>Description (required)</li>
                <li>Message (required)</li>
                <li>Pin code (required)</li>
              </ul>
              <p>Then Save.</p>

              <h3>5. Updating a payment order (header)</h3>
              <p>You can change:</p>
              <ul>
                <li>Transaction</li>
                <li>Payment order date</li>
                <li>Description</li>
                <li>Message</li>
                <li>Pin code</li>
              </ul>
              <p>Operationally, the screen supports quick editing:</p>
              <ul>
                <li>
                  existing orders can save when you click away (depending on how
                  you edit)
                </li>
                <li>new orders are saved as a full new record</li>
              </ul>

              <h3>6. Deleting a payment order</h3>
              <p>When you delete a payment order:</p>
              <ul>
                <li>the system hides it from normal working lists</li>
                <li>it is not removed permanently (so history can be kept)</li>
              </ul>

              <h3>7. Payment order amount is calculated (not typed)</h3>
              <p>
                The payment order total is calculated automatically as the sum
                of all active (non-deleted) payment lines.
              </p>

              <h3>8. Payment order lines — how staff register payments</h3>
              <p>Every payment line must be tied to a transaction:</p>
              <ul>
                <li>
                  either the header transaction is set and lines “inherit” it,
                  or
                </li>
                <li>the line selects a transaction override</li>
              </ul>
              <p>If neither is set, the system blocks saving the line.</p>

              <h3>9. Booked payment orders are locked (read-only)</h3>
              <p>
                A payment order becomes read-only when it is Booked (final
                signature):
              </p>
              <ul>
                <li>the header cannot be edited or deleted</li>
                <li>payment lines cannot be added/edited/deleted</li>
              </ul>
              <p>
                The UI shows this by disabling actions and showing a “Booked /
                read-only” message.
              </p>

              <h3>10. Safety rules that prevent over-paying</h3>
              <p>The system checks “do not exceed” rules:</p>
              <ul>
                <li>Cost detail payments require planned allocation first</li>
                <li>
                  Payments cannot exceed planned allocation for that transaction
                  + cost detail
                </li>
                <li>
                  Payments cannot exceed the transaction’s approved amount
                </li>
              </ul>

              <h3>11. Practical operational rules (summary)</h3>
              <ul>
                <li>Payment orders are containers; lines are the payments</li>
                <li>Totals are automatic</li>
                <li>Every payment must link to a transaction</li>
                <li>Booked means read-only</li>
                <li>Allocations and approvals protect payments</li>
              </ul>

              <BackToTop />
            </section>

            {/* ===================== */}
            {/* PART 5 */}
            {/* ===================== */}
            <section className={styles.part} id="part-5">
              <h2>
                Part 5: Signatures — What They Are, How They’re Created, and How
                They’re Maintained
              </h2>

              <h3>What this section is for</h3>
              <p>
                This section explains how the Signatures part of the Relief
                Projects ERP is used in day-to-day work:
              </p>
              <ul>
                <li>What a signature represents in the system</li>
                <li>How staff add a signature to a payment order</li>
                <li>How staff edit or remove a signature</li>
                <li>
                  How “Booked” (final signature) affects payment orders
                  (locking)
                </li>
              </ul>
              <p>
                Signatures are primarily used to control and document approval /
                booking of payment orders.
              </p>

              <h3>1. What a signature is</h3>
              <p>
                A Signature is a recorded approval action linked to a specific
                payment order.
              </p>
              <p>Operationally, signatures answer questions like:</p>
              <ul>
                <li>Who approved / signed this payment order?</li>
                <li>When did they sign it?</li>
                <li>What type of signature was it (status)?</li>
                <li>Is the payment order finalized (“Booked”)?</li>
              </ul>
              <p>
                A payment order can have more than one signature, depending on
                your organization’s approval workflow.
              </p>

              <h3>2. What a signature contains</h3>
              <p>Each signature record includes:</p>
              <ul>
                <li>Signature status (what kind of signature this is)</li>
                <li>Employee (who signed)</li>
                <li>Payment order (what they signed)</li>
                <li>
                  Signature text (a short signature label; often the person’s
                  name or confirmation text)
                </li>
                <li>Signature date/time (when it was signed)</li>
              </ul>

              <h3>3. Signature statuses (approval steps)</h3>
              <p>
                Signatures use statuses to reflect the approval stage (your
                exact status list may vary).
              </p>
              <p>
                <strong>Booked = final signature</strong>
              </p>
              <p>
                When a payment order has a signature with status Booked, the
                system treats the payment order as finalized. This is what
                triggers the locking behavior described in Part 4.
              </p>

              <h3>4. How the Signatures page works</h3>
              <ul>
                <li>Select a project</li>
                <li>
                  Signatures are shown in the context of the current project.
                </li>
                <li>Review signatures in a table</li>
              </ul>
              <p>You typically see columns like:</p>
              <ul>
                <li>Status</li>
                <li>Employee</li>
                <li>Payment order reference (e.g., PO number)</li>
                <li>Signature text</li>
                <li>Signature date/time</li>
                <li>Optional: choose visible columns</li>
              </ul>
              <p>
                The signatures table may allow hiding/showing columns to reduce
                clutter.
              </p>

              <h3>5. Creating a new signature</h3>
              <h4>What staff do:</h4>
              <ul>
                <li>Click New</li>
                <li>Choose the signature status</li>
                <li>Choose the employee (signer)</li>
                <li>Choose the payment order</li>
                <li>Enter signature text</li>
                <li>Set the signature date/time</li>
                <li>Click Save</li>
              </ul>

              <h4>What the system does:</h4>
              <ul>
                <li>saves the signature</li>
                <li>shows field messages if required items are missing</li>
                <li>displays the signature in the list</li>
              </ul>

              <h3>6. Editing an existing signature</h3>
              <p>What staff do:</p>
              <ul>
                <li>Click Edit on a signature row</li>
                <li>
                  Change fields (status, signer, payment order, signature text,
                  date/time)
                </li>
                <li>Save</li>
              </ul>
              <p>Operational caution:</p>
              <ul>
                <li>
                  Editing signatures changes the project’s approval trail. In
                  many organizations, edits are restricted to corrections only.
                </li>
              </ul>

              <h3>7. Deleting a signature</h3>
              <p>When you delete a signature:</p>
              <ul>
                <li>it is hidden from normal working lists</li>
                <li>it is not removed permanently (so history can be kept)</li>
              </ul>

              <h3>8. How signatures affect payment orders (locking)</h3>
              <p>
                <strong>Booked status locks a payment order.</strong>
              </p>
              <p>If a payment order is Booked:</p>
              <ul>
                <li>the payment order header becomes read-only</li>
                <li>payment order lines become read-only</li>
                <li>
                  the order cannot be edited or deleted through normal
                  operations
                </li>
              </ul>
              <p>Operational meaning:</p>
              <ul>
                <li>Booking is the “finalization” step</li>
                <li>
                  Once Booked, changes should only happen through whatever
                  reversal process your organization defines (if any)
                </li>
              </ul>

              <h3>9. Practical operational rules (summary)</h3>
              <ul>
                <li>
                  <strong>
                    Rule 1 — Signatures are tied to payment orders
                  </strong>
                  <br />
                  You don’t sign a project directly; you sign a payment order.
                </li>
                <li>
                  <strong>Rule 2 — Use the correct signature status</strong>
                  <br />
                  Status communicates where the payment order is in the approval
                  process.
                </li>
                <li>
                  <strong>Rule 3 — Treat Booked as final</strong>
                  <br />
                  Booked locks the payment order and prevents further edits.
                </li>
                <li>
                  <strong>Rule 4 — Keep signature date/time accurate</strong>
                  <br />
                  This is part of the audit trail and approval history.
                </li>
                <li>
                  <strong>Rule 5 — Avoid duplicate “final” approvals</strong>
                  <br />
                  As a process rule, one person should generally not “Book” the
                  same payment order more than once.
                </li>
              </ul>

              <BackToTop />
            </section>

            {/* ===================== */}
            {/* PART 6 */}
            {/* ===================== */}
            <section className={styles.part} id="part-6">
              <h2>
                Part 6: Recipients — What They Are, How They’re Created, and How
                They’re Maintained
              </h2>

              <h3>What this section is for</h3>
              <p>
                This section explains how the Recipients part of the Relief
                Projects ERP is used in day-to-day work:
              </p>
              <ul>
                <li>What a recipient represents in the system</li>
                <li>How staff create a new recipient entry</li>
                <li>How staff update an existing recipient entry</li>
                <li>
                  How staff delete a recipient entry (hidden from normal lists,
                  not removed permanently)
                </li>
                <li>How the recipient amount is shown and what it means</li>
              </ul>
              <p>
                Recipients rely on projects, payment orders, and organizations.
              </p>

              <h3>1. What a recipient is</h3>
              <p>
                A Recipient is an organization that is associated with a
                specific payment order as a payee/recipient.
              </p>
              <p>In practical terms, recipients help answer:</p>
              <ul>
                <li>
                  “Which organizations are receiving money under our payment
                  orders?”
                </li>
                <li>
                  “Which payment order is this organization connected to?”
                </li>
                <li>
                  “What is the total amount currently linked to this recipient
                  in that payment order?”
                </li>
              </ul>

              <h3>2. What a recipient contains</h3>
              <p>Each recipient entry includes:</p>
              <ul>
                <li>Organization (who is receiving funds)</li>
                <li>
                  Payment Order (which payment order they are connected to)
                </li>
                <li>Amount (calculated by the system)</li>
              </ul>

              <h4>Important operational point about the amount:</h4>
              <ul>
                <li>Staff do not type the recipient amount.</li>
                <li>
                  The system calculates it automatically based on the payment
                  order’s payment lines for that organization.
                </li>
                <li>
                  The amount is read-only and updates when payment lines change.
                </li>
              </ul>

              <h3>3. How the Recipients page works</h3>
              <h4>Select a project</h4>
              <p>Recipients are shown in the context of the current project.</p>
              <p>If no project is selected:</p>
              <ul>
                <li>the page shows an empty state message</li>
                <li>the New button is disabled</li>
              </ul>

              <h4>Review recipients in a table</h4>
              <p>You typically see:</p>
              <ul>
                <li>Organization</li>
                <li>Payment Order</li>
                <li>Amount (calculated)</li>
                <li>Optional: choose visible columns</li>
              </ul>
              <p>
                The table may allow hiding/showing columns to reduce clutter.
              </p>

              <h3>4. Creating a new recipient</h3>
              <p>What staff do:</p>
              <ul>
                <li>Click New</li>
                <li>Select the Organization</li>
                <li>Select the Payment Order</li>
                <li>Click Save</li>
              </ul>

              <p>What the system does:</p>
              <ul>
                <li>Saves the recipient entry</li>
                <li>
                  Shows validation messages if required fields are missing
                </li>
                <li>Displays the recipient in the list</li>
                <li>
                  Shows the recipient’s calculated amount (which may be 0 if no
                  payment lines exist yet for that organization under that
                  payment order)
                </li>
              </ul>

              <p>Practical note:</p>
              <ul>
                <li>
                  Recipients are often created to help track payees early, but
                  the amount only becomes meaningful once payment lines are
                  added to the payment order.
                </li>
              </ul>

              <h3>5. Updating an existing recipient</h3>
              <p>What staff can update:</p>
              <ul>
                <li>The Organization</li>
                <li>The Payment Order</li>
              </ul>

              <p>What happens when you update:</p>
              <ul>
                <li>The recipient entry is updated</li>
                <li>
                  The amount displayed may change, because it is calculated from
                  the payment lines that match the recipient’s organization and
                  payment order
                </li>
              </ul>

              <p>Operational caution:</p>
              <ul>
                <li>
                  If you change a recipient’s organization or payment order
                  after payments are already being prepared, you may confuse the
                  audit trail. Do this only when you are correcting a mistake.
                </li>
              </ul>

              <h3>6. Deleting a recipient</h3>
              <p>When you delete a recipient:</p>
              <ul>
                <li>It is hidden from normal working lists</li>
                <li>It is not removed permanently (so history can be kept)</li>
              </ul>

              <p>Practical note:</p>
              <ul>
                <li>
                  Deleting a recipient does not “erase” payment orders or
                  payment lines. It only removes the recipient entry from normal
                  operational views.
                </li>
              </ul>

              <h3>7. Relationship to payment orders and payment lines</h3>
              <ul>
                <li>
                  Payment orders contain the payment lines (actual payment
                  entries).
                </li>
                <li>
                  Recipients provide an overview of which organizations are
                  connected to each payment order and what amount is currently
                  associated with them.
                </li>
              </ul>
              <p>
                So, recipients are best understood as a summary/recipient
                register per payment order.
              </p>

              <h3>8. Practical operational rules (summary)</h3>
              <ul>
                <li>
                  <strong>Rule 1 — Select the correct project first</strong>
                  <br />
                  Recipients are project-scoped; always confirm the current
                  project to avoid working in the wrong context.
                </li>
                <li>
                  <strong>Rule 2 — Recipient amount is automatic</strong>
                  <br />
                  Staff do not enter the amount; the system calculates it from
                  payment lines.
                </li>
                <li>
                  <strong>Rule 3 — Use recipients as a payee overview</strong>
                  <br />
                  Recipients help you confirm “who is getting paid” per payment
                  order.
                </li>
                <li>
                  <strong>Rule 4 — Be careful when editing recipients</strong>
                  <br />
                  Changes affect which payment lines are summarized under the
                  recipient and can confuse tracking if done late.
                </li>
                <li>
                  <strong>
                    Rule 5 — Deleting hides the record, it doesn’t erase history
                  </strong>
                  <br />
                  Deletion removes it from working lists, but keeps
                  traceability.
                </li>
              </ul>

              <BackToTop />
            </section>

            {/* ===================== */}
            {/* PART 7 */}
            {/* ===================== */}
            <section className={styles.part} id="part-7">
              <h2>
                Part 7: Related Organizations — What They Are, How They’re
                Linked to Projects, and How They’re Maintained
              </h2>

              <h3>What this section is for</h3>
              <p>
                This section explains how Related Organizations are used in
                day-to-day work:
              </p>
              <ul>
                <li>What an organization is in the system (master record)</li>
                <li>
                  How organizations are linked to a project with a status/role
                </li>
                <li>How staff add, update, and remove organization links</li>
                <li>How staff view extra details (address and bank info)</li>
                <li>
                  Practical rules that keep reporting and payments consistent
                </li>
              </ul>

              <h3>
                1. Two concepts to understand: “Organizations” vs “Project
                links”
              </h3>
              <p>In this system there are two related layers:</p>

              <h4>A) Organization (master record)</h4>
              <p>An Organization is a real-world entity such as:</p>
              <ul>
                <li>donor</li>
                <li>implementing partner</li>
                <li>vendor/supplier</li>
                <li>local authority</li>
                <li>stakeholder</li>
                <li>recipient organization</li>
              </ul>
              <p>The organization record typically stores:</p>
              <ul>
                <li>name</li>
                <li>contact email</li>
                <li>contact phone</li>
                <li>address (if recorded)</li>
              </ul>

              <h4>B) Project–Organization link (the relationship)</h4>
              <p>
                A project does not just “have organizations” — it has
                relationships to organizations. Each relationship includes:
              </p>
              <ul>
                <li>which project</li>
                <li>which organization</li>
                <li>
                  what status/role that organization has in this project (for
                  example: Donor, Partner, Vendor, Authority)
                </li>
              </ul>
              <p>
                That status is important because it explains why the
                organization is involved.
              </p>

              <h3>2. What “Related Organizations” are used for</h3>
              <p>Linking organizations to a project helps staff:</p>
              <ul>
                <li>keep a clear list of who is involved in the project</li>
                <li>show what role each organization plays</li>
                <li>
                  support reporting and oversight (e.g., “all projects funded by
                  X”)
                </li>
                <li>
                  support downstream workflows (payments, recipients,
                  transactions) by having consistent organization references
                </li>
              </ul>

              <h3>3. How the Related Organizations page works</h3>
              <h4>Select a project</h4>
              <p>
                Related organizations are managed per project. If no project is
                selected:
              </p>
              <ul>
                <li>the list is empty</li>
                <li>the New button is disabled</li>
              </ul>

              <h4>Review linked organizations in a table</h4>
              <p>The table typically shows:</p>
              <ul>
                <li>Organization</li>
                <li>Status (their role in this project)</li>
                <li>Optional: show/hide columns</li>
              </ul>

              <h4>Expandable details (address and bank details)</h4>
              <p>
                For an organization already linked to a project, staff can open
                extra panels such as:
              </p>
              <ul>
                <li>Address details</li>
                <li>Bank details</li>
              </ul>
              <p>
                These are for reference and verification (especially before
                payments).
              </p>

              <h3>4. Linking a new organization to a project</h3>
              <p>What staff do:</p>
              <ul>
                <li>Click New</li>
                <li>Select the Organization</li>
                <li>
                  Select the Status/Role (e.g., Donor / Implementing partner /
                  Vendor)
                </li>
                <li>Click Save</li>
              </ul>

              <p>What the system does:</p>
              <ul>
                <li>
                  Creates the link so the organization appears in the project’s
                  related organizations list
                </li>
                <li>
                  Shows validation messages if required fields are missing
                </li>
              </ul>

              <h4>Important rule: No duplicates for the same role</h4>
              <p>
                The system prevents linking the same organization to the same
                project with the same status more than once.
              </p>
              <p>
                If staff try to add an identical link again, the system blocks
                it and shows an explanation.
              </p>

              <p>Practical note:</p>
              <ul>
                <li>
                  The same organization can appear more than once in the same
                  project if the status/role is different.
                </li>
              </ul>

              <h3>5. Updating an existing organization link</h3>
              <p>What staff can change:</p>
              <ul>
                <li>the Organization (only if correcting a mistake)</li>
                <li>the Status/Role</li>
              </ul>

              <p>What happens when you update:</p>
              <ul>
                <li>
                  The project’s related-organization list refreshes with the new
                  relationship details
                </li>
                <li>
                  If the change would create a duplicate (same project + same
                  organization + same status), the system blocks it
                </li>
              </ul>

              <p>Operational caution:</p>
              <ul>
                <li>
                  Changing roles late in the workflow can affect reporting
                  clarity. Do this only when correcting errors or when the
                  project governance officially changes.
                </li>
              </ul>

              <h3>6. Removing an organization from a project</h3>
              <p>When staff remove an organization link:</p>
              <ul>
                <li>
                  The organization is removed from the project’s related
                  organizations list
                </li>
                <li>
                  It is hidden from normal working views (so you keep
                  traceability)
                </li>
              </ul>

              <p>Practical note:</p>
              <ul>
                <li>
                  Removing a link does not “delete” the organization from the
                  system.
                </li>
                <li>
                  It only removes the organization’s relationship to that
                  specific project (under that status).
                </li>
              </ul>

              <h3>
                7. Organizations master records (creation and maintenance)
              </h3>
              <p>
                Organizations also exist as standalone master records in the
                system.
              </p>
              <p>In typical operations:</p>
              <ul>
                <li>
                  Organizations are created once (name + contacts + address)
                </li>
                <li>Then they are reused across many projects</li>
              </ul>

              <p>Organization details commonly include:</p>
              <ul>
                <li>Organization name</li>
                <li>Contact email</li>
                <li>Contact phone</li>
                <li>Address (assigned/updated as needed)</li>
              </ul>

              <p>Practical note:</p>
              <ul>
                <li>
                  Keep organization names consistent and avoid duplicates.
                </li>
              </ul>

              <h3>8. Practical operational rules (summary)</h3>
              <ul>
                <li>
                  <strong>Rule 1 — Link organizations to projects early</strong>
                  <br />
                  This improves clarity and reduces confusion later.
                </li>
                <li>
                  <strong>
                    Rule 2 — Always assign the correct status/role
                  </strong>
                  <br />
                  Status is what makes the relationship meaningful.
                </li>
                <li>
                  <strong>Rule 3 — Avoid duplicates</strong>
                  <br />
                  The same organization cannot be linked with the same status
                  more than once.
                </li>
                <li>
                  <strong>
                    Rule 4 — Use the detail panels for verification
                  </strong>
                  <br />
                  Address and bank details are useful checks before issuing
                  payment orders.
                </li>
                <li>
                  <strong>Rule 5 — Be cautious when changing roles</strong>
                  <br />
                  Updating links affects how the project is understood and
                  reported.
                </li>
              </ul>

              <BackToTop />
            </section>

            {/* ===================== */}
            {/* PART 8 */}
            {/* ===================== */}
            <section className={styles.part} id="part-8">
              <h2>
                Part 8: Documents — What They Are, How They’re Uploaded, and How
                They’re Maintained
              </h2>

              <h3>What this section is for</h3>
              <p>
                This section explains how the Documents part of the Relief
                Projects ERP is used in day-to-day work:
              </p>
              <ul>
                <li>What a document represents in the system</li>
                <li>
                  How staff upload documents to a project (drag &amp; drop /
                  file picker)
                </li>
                <li>How documents are stored (file + metadata)</li>
                <li>How staff download and delete documents</li>
                <li>
                  Practical rules (size limits, soft delete, and project
                  context)
                </li>
              </ul>

              <h3>1. What a “Document” is in the system</h3>
              <p>
                A Document is a file attached to a project, stored for
                operational traceability.
              </p>
              <p>Examples:</p>
              <ul>
                <li>signed agreements / MoUs</li>
                <li>invoices, receipts, procurement docs</li>
                <li>donor communications</li>
                <li>photos or scans of key paperwork</li>
                <li>verification documents (depending on policy)</li>
              </ul>

              <p>Each document record stores:</p>
              <ul>
                <li>Project (which project it belongs to)</li>
                <li>Employee (who uploaded/registered it)</li>
                <li>Document name (the user-facing filename)</li>
                <li>Document path (the stored filename/path on disk)</li>
                <li>Soft-delete tracking:</li>
                <li>is_deleted</li>
                <li>deleted_at</li>
              </ul>

              <p>Key idea:</p>
              <ul>
                <li>The file itself is stored on disk.</li>
                <li>
                  The database stores metadata (name/path + links to
                  project/employee).
                </li>
              </ul>

              <h3>
                2. Project context: documents always belong to the selected
                project
              </h3>
              <p>Documents are shown and managed per project.</p>
              <p>Operational behavior:</p>
              <ul>
                <li>
                  If no project is selected, the page shows: “Please select a
                  project first.”
                </li>
                <li>
                  When a project is selected, the system loads only documents
                  for that project.
                </li>
              </ul>
              <p>
                This prevents staff from uploading or deleting documents in the
                wrong project.
              </p>

              <h3>3. Upload limits (important)</h3>
              <p>The system uses Spring multipart upload limits:</p>
              <ul>
                <li>Max size per file: 50 MB</li>
                <li>Max request size: 50 MB</li>
              </ul>

              <h3>4. How uploading works (what staff do)</h3>
              <p>On the Documents page, staff can upload using:</p>
              <ul>
                <li>Drag &amp; drop onto the upload area, or</li>
                <li>Click to select a file (file picker)</li>
              </ul>
              <p>When a user uploads:</p>
              <ol>
                <li>
                  The UI starts the upload and shows a short status message.
                </li>
                <li>The backend saves the file on disk.</li>
                <li>
                  The backend creates a new documents record in the database.
                </li>
                <li>The document appears in the list immediately.</li>
              </ol>

              <h3>5. Where documents are stored (server-side)</h3>
              <p>When a file is uploaded, the backend stores it in:</p>
              <ul>
                <li>
                  <code>D:/projects/relief-projects/public/documents</code>
                </li>
              </ul>

              <h3>6. Downloading documents</h3>
              <p>Each document row has a Download link.</p>

              <h3>7. Deleting documents (soft delete)</h3>
              <p>When a user clicks Delete:</p>
              <ul>
                <li>they receive a confirmation prompt</li>
                <li>the backend does a soft delete:</li>
                <li>is_deleted = true</li>
                <li>deleted_at = NOW()</li>
              </ul>

              <h3>8. What the system guarantees (rules)</h3>
              <ul>
                <li>
                  <strong>
                    Rule 1 — Documents are always linked to a project
                  </strong>
                </li>
                <li>
                  <strong>Rule 2 — Every document has an employee owner</strong>
                </li>
                <li>
                  <strong>Rule 3 — Size limits are enforced</strong>
                </li>
                <li>
                  <strong>Rule 4 — Deleting is safe</strong>
                </li>
              </ul>

              <h3>9. Quick user guide summary</h3>
              <ol>
                <li>Select a project</li>
                <li>Upload using drag &amp; drop or click-to-select</li>
                <li>Confirm the document appears in the list</li>
                <li>Download any file when needed</li>
                <li>Delete documents only when appropriate (soft delete)</li>
              </ol>

              <BackToTop />
            </section>

            {/* ===================== */}
            {/* PART 9 */}
            {/* ===================== */}
            <section className={styles.part} id="part-9">
              <h2>
                Part 9: Statistics — What They Show and How Staff Use Them
              </h2>

              <h3>What this section is for</h3>
              <p>This section explains:</p>
              <ul>
                <li>What Statistics is meant to help you understand</li>
                <li>What the two charts show</li>
                <li>How to read the numbers and tooltips</li>
                <li>
                  What staff should do if something looks missing or
                  inconsistent
                </li>
              </ul>

              <h3>1. What Statistics is trying to achieve</h3>
              <p>
                Statistics gives staff a quick overview of the project
                portfolio.
              </p>

              <h3>2. Statistics is “global” (not project-specific)</h3>
              <p>
                Unlike most pages, Statistics does not use the current project
                dropdown.
              </p>

              <h3>3. What you see on the Statistics page</h3>
              <p>The page contains two charts:</p>
              <ul>
                <li>Pie chart — Projects by Sector</li>
                <li>Bar chart — Projects by Project Type</li>
              </ul>

              <h3>4. How to use the charts (day-to-day)</h3>
              <p>
                Use charts to spot missing classifications and understand
                portfolio distribution.
              </p>

              <h3>5. Why numbers may not match expectations</h3>
              <ul>
                <li>Projects missing sector links</li>
                <li>Projects missing project type</li>
                <li>Soft-deleted projects/links</li>
              </ul>

              <h3>6. Practical operational rules (summary)</h3>
              <ul>
                <li>Statistics reflects data quality</li>
                <li>Use tooltips to identify specific projects</li>
                <li>Confirm details in project records when needed</li>
              </ul>

              <BackToTop />
            </section>
          </article>
        </div>
      </div>
    </div>
  );
};

export default OperationalGuide;
