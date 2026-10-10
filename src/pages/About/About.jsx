import React from "react";
import { Link } from "react-router-dom";
import styles from "./About.module.scss";
import {
  FiHeart,
  FiShield,
  FiUsers,
  FiTrendingUp,
  FiCheckCircle,
  FiBookOpen,
} from "react-icons/fi";

const About = () => {
  return (
    <div className={styles.page} id="top">
      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h1 className={styles.pageTitle}>
              <FiHeart aria-hidden="true" /> About Relief Projects
            </h1>
            <p className={styles.pageSubtitle}>
              A simple, shared workspace for planning, tracking, and delivering
              relief projects with clarity.
            </p>
          </div>
        </header>

        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroCard}>
            <div className={styles.heroKicker}>
              <FiBookOpen /> Welcome
            </div>
            <h2 className={styles.heroTitle}>
              Follow the story from the first proposal to archive review.
            </h2>
            <p className={styles.heroText}>
              Relief Projects brings together the purpose of a project, the
              people responsible, its plans and the record of what happened.
              Teams can review proposals, explain budget changes, record money
              received and paid, follow up on work, and keep supporting documents
              alongside their decisions.
            </p>
          </div>

          <div className={styles.heroSide}>
            <div className={styles.statCard}>
              <div className={styles.statTitle}>Guiding idea</div>
              <div className={styles.statValue}>Keep context</div>
              <p className={styles.statText}>
                Check the selected project as you work. Personal follow-ups,
                the travel schedule and Statistics also help you look across projects.
              </p>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTitle}>Goal</div>
              <div className={styles.statValue}>Traceability</div>
              <p className={styles.statText}>
                Clear links between plans, decisions, approvals, and money
                movement.
              </p>
            </div>
          </div>
        </section>

        {/* WHAT IT HELPS WITH */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What you can do</h2>

          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <FiUsers />
              </div>
              <h3 className={styles.cardTitle}>Coordinate teams</h3>
              <p className={styles.cardText}>
                Describe the project and its intended participants, connect
                partners and staff, and assign follow-ups with deadlines.
                Track work through To do, In progress and Done.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <FiTrendingUp />
              </div>
              <h3 className={styles.cardTitle}>Plan and track budgets</h3>
              <p className={styles.cardText}>
                Build itemised budgets with quantities and prices. Review
                revisions, donor decisions and which plan is current, while
                keeping earlier financial references understandable.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <FiShield />
              </div>
              <h3 className={styles.cardTitle}>Understand the financial record</h3>
              <p className={styles.cardText}>
                Keep requested and approved funding, commitments, receipts,
                payments and returns distinct. Review limits and warnings
                without mistaking an approved amount for money already received.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <FiCheckCircle />
              </div>
              <h3 className={styles.cardTitle}>Review decisions independently</h3>
              <p className={styles.cardText}>
                Submit project and partner-role assessments for independent
                review. Record explanations, supporting evidence and corrections
                so people can understand the basis of each decision.
              </p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}><FiTrendingUp aria-hidden="true" /></div>
              <h3 className={styles.cardTitle}>Follow delivery and learning</h3>
              <p className={styles.cardText}>
                Review risks, report results against targets and respond to
                findings and lessons. Plan travel, obtain independent approval
                and report what actually happened afterwards.
              </p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}><FiBookOpen aria-hidden="true" /></div>
              <h3 className={styles.cardTitle}>Keep evidence and closeout clear</h3>
              <p className={styles.cardText}>
                Link specific document versions, print payment-order reports
                and retain late evidence. Record final-report acceptance,
                administrative closeout, archive filing and digital-storage review.
              </p>
            </div>
          </div>
        </section>

        {/* HOW TO THINK ABOUT IT */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How to think about the system</h2>

          <div className={styles.flow}>
            <div className={styles.flowStep}>
              <div className={styles.flowNumber}>1</div>
              <div className={styles.flowBody}>
                <h3 className={styles.flowTitle}>
                  A project is the main folder
                </h3>
                <p className={styles.flowText}>
                  The project connects its plans, partners, activities and
                  documents. Shared organisation and staff records can be used
                  across projects without making their assessments interchangeable.
                </p>
              </div>
            </div>

            <div className={styles.flowStep}>
              <div className={styles.flowNumber}>2</div>
              <div className={styles.flowBody}>
                <h3 className={styles.flowTitle}>Budgets describe the plan</h3>
                <p className={styles.flowText}>
                  Budgets define what you expect to spend and how it breaks down
                  into cost lines.
                </p>
              </div>
            </div>

            <div className={styles.flowStep}>
              <div className={styles.flowNumber}>3</div>
              <div className={styles.flowBody}>
                <h3 className={styles.flowTitle}>
                  Transactions describe funding
                </h3>
                <p className={styles.flowText}>
                  Transactions record funding requested or approved from a
                  financier. Receipts separately record money reported as received.
                </p>
              </div>
            </div>

            <div className={styles.flowStep}>
              <div className={styles.flowNumber}>4</div>
              <div className={styles.flowBody}>
                <h3 className={styles.flowTitle}>
                  Payment orders record commitments
                </h3>
                <p className={styles.flowText}>
                  Order lines commit amounts against funding and costs.
                  Outgoing payments separately record money reported as paid.
                  The system does not send bank transfers. Returns are recorded
                  against the original receipt or payment.
                </p>
              </div>
            </div>

            <div className={styles.flowStep}>
              <div className={styles.flowNumber}>5</div>
              <div className={styles.flowBody}>
                <h3 className={styles.flowTitle}>
                  Decisions and evidence explain the record
                </h3>
                <p className={styles.flowText}>
                  Recorded reviews and their document versions explain what
                  people considered. Signature records and Booked status do not
                  prove payment or verify signatures. Administrative closeout
                  and archive filing are separate recorded decisions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CULTURE / PRINCIPLES */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Principles we try to support</h2>

          <div className={styles.principles}>
            <div className={styles.principle}>
              <h3 className={styles.principleTitle}>Clarity</h3>
              <p className={styles.principleText}>
                Explain what each amount, status and decision means. Unknown
                information should remain visible as unknown.
              </p>
            </div>

            <div className={styles.principle}>
              <h3 className={styles.principleTitle}>Accountability</h3>
              <p className={styles.principleText}>
                Keep decisions, reasons and supporting evidence connected.
                Use the available correction and history views to understand
                changes without assuming every ordinary field edit has a full history.
              </p>
            </div>

            <div className={styles.principle}>
              <h3 className={styles.principleTitle}>Operational safety</h3>
              <p className={styles.principleText}>
                Review permissions, independent-review requirements and warnings
                before acting. A completed task, approved assessment and recorded
                payment each establish something different.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What the records do not establish</h2>
          <div className={styles.principles}>
            <div className={styles.principle}>
              <h3 className={styles.principleTitle}>Financial records need interpretation</h3>
              <p className={styles.principleText}>
                Recorded receipts and payments are user-entered facts, not bank
                reconciliation. Returns do not create extra spending permission.
                Actual payments can show an excess warning even where commitment
                limits were respected.
              </p>
            </div>
            <div className={styles.principle}>
              <h3 className={styles.principleTitle}>Evidence supports human review</h3>
              <p className={styles.principleText}>
                A linked file does not certify its contents or completeness.
                Reported results are not independently verified outcomes.
                A digital-storage review date is not permission to destroy records.
              </p>
            </div>
            <div className={styles.principle}>
              <h3 className={styles.principleTitle}>Calendar publication is limited</h3>
              <p className={styles.principleText}>
                Calendar downloads are snapshots. The optional Outlook test
                preview can publish new follow-ups, but automatic updates and
                removals remain blocked. Existing copies need manual attention;
                full synchronization is not available.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={styles.footerNote}>
          <p className={styles.footerText}>
            Start with the <Link to="/operational-guide">Operational guide</Link>
            {" "}for everyday instructions, examples and explanations of what each
            result means. Practise with records labelled “Fictional demo — for
            training and testing only”. Illustrative photographs do not document
            those fictional projects. Demo approvals and financial records
            represent no real authorisation or money movement.
          </p>
        </section>
      </div>
    </div>
  );
};

export default About;
