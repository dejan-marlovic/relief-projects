import React from "react";
import styles from "../OperationalGuide/OperationalGuide.module.scss";
import { FiShield, FiAlertTriangle, FiArrowUp } from "react-icons/fi";

// Smooth scroll helper (same pattern as your guide)
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
    window.history.pushState(null, "", href);
    scrollToHash(href);
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

const AdminPlaceholder = () => {
  return (
    <div className={styles.page} id="top">
      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>
              <FiShield /> Admin — System Management
            </h3>
            <p className={styles.pageSubtitle}>
              Administrative tools for managing master data and restoring
              deleted records.
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
                  <TocLink href="#admin-1">1) Under construction</TocLink>
                </li>
                <li>
                  <TocLink href="#admin-2">2) What Admin will manage</TocLink>
                </li>
                <li>
                  <TocLink href="#admin-3">
                    3) Restoring soft-deleted entities
                  </TocLink>
                </li>
                <li>
                  <TocLink href="#admin-4">4) Safety rules</TocLink>
                </li>
              </ul>
            </div>
          </aside>

          {/* CONTENT */}
          <article className={styles.content}>
            <section className={styles.part} id="admin-1">
              <h2>1) Under construction</h2>

              <p>
                <FiAlertTriangle style={{ position: "relative", top: 2 }} />{" "}
                <strong>This Admin section is under construction.</strong>
              </p>
              <p>
                The goal of this tab is to give authorized administrators one
                place to:
              </p>
              <ul>
                <li>
                  create and maintain “master data” (all the supporting entity
                  types)
                </li>
                <li>
                  manage system-wide reference lists (statuses, types,
                  currencies, etc.)
                </li>
                <li>restore records that were soft-deleted by mistake</li>
              </ul>

              <BackToTop />
            </section>

            <section className={styles.part} id="admin-2">
              <h2>2) What Admin will manage</h2>

              <p>
                Based on your database design, Admin is intended to manage the
                “building block” tables that other modules depend on.
              </p>

              <h3>Common master-data examples</h3>
              <ul>
                <li>Positions, Employees, Users</li>
                <li>Currencies, Exchange Rates</li>
                <li>Cost Types, Costs</li>
                <li>Project Statuses, Project Types, Sectors</li>
                <li>Organization Statuses</li>
                <li>Transaction Statuses, Signature Statuses</li>
                <li>Addresses (if managed centrally)</li>
              </ul>

              <p>
                This keeps normal operational tabs focused on day-to-day work,
                while Admin becomes the “configuration + recovery” area.
              </p>

              <BackToTop />
            </section>

            <section className={styles.part} id="admin-3">
              <h2>3) Restoring soft-deleted entities</h2>

              <p>Your schema consistently uses soft delete fields like:</p>
              <ul>
                <li>
                  <code>is_deleted</code> (boolean flag)
                </li>
                <li>
                  <code>deleted_at</code> (timestamp when it was deleted)
                </li>
              </ul>

              <h3>What “restore” means</h3>
              <p>Restoring typically means:</p>
              <ul>
                <li>
                  set <code>is_deleted = false</code>
                </li>
                <li>
                  set <code>deleted_at = NULL</code>
                </li>
                <li>re-enable the record in normal lists and dropdowns</li>
              </ul>

              <h3>Examples of what could be restorable</h3>
              <ul>
                <li>
                  Projects and project links (project_sector,
                  project_organization, employee_project)
                </li>
                <li>Budgets and cost details</li>
                <li>Transactions and cost_detail_allocations</li>
                <li>Payment orders and payment_order_lines</li>
                <li>Documents and memos</li>
                <li>
                  Organizations, locations, bank details (if they were
                  soft-deleted)
                </li>
              </ul>

              <BackToTop />
            </section>

            <section className={styles.part} id="admin-4">
              <h2>4) Safety rules</h2>

              <p>
                Because Admin actions affect system integrity, this tab should
                enforce:
              </p>
              <ul>
                <li>role-based access (only Admin users see/use it)</li>
                <li>confirmation dialogs for restore/delete actions</li>
                <li>
                  validation to prevent restoring “broken references” (example:
                  restoring a child link when the parent is still deleted)
                </li>
                <li>optional: audit logging (who restored what, and when)</li>
              </ul>

              <BackToTop />
            </section>
          </article>
        </div>
      </div>
    </div>
  );
};

export default AdminPlaceholder;
