import React from "react";
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
            <h3 className={styles.pageTitle}>
              <FiHeart /> About Relief Projects ERP
            </h3>
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
              One system, one project file, fewer mistakes.
            </h2>
            <p className={styles.heroText}>
              Relief Projects ERP is designed to bring day-to-day project work
              into one consistent place — so teams can spend less time searching
              for information and more time delivering support. It connects the
              “story of the project” (who, what, where, why) with the
              operational controls (budgets, funding, payments, approvals, and
              documents).
            </p>
          </div>

          <div className={styles.heroSide}>
            <div className={styles.statCard}>
              <div className={styles.statTitle}>Guiding idea</div>
              <div className={styles.statValue}>Keep context</div>
              <p className={styles.statText}>
                Select a project once, then work confidently across modules
                without mixing data.
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
          <h2 className={styles.sectionTitle}>What the ERP helps you do</h2>

          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <FiUsers />
              </div>
              <h3 className={styles.cardTitle}>Coordinate teams</h3>
              <p className={styles.cardText}>
                Keep projects, partners, staff roles, and notes connected so the
                whole team shares the same “project file”.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <FiTrendingUp />
              </div>
              <h3 className={styles.cardTitle}>Plan and track budgets</h3>
              <p className={styles.cardText}>
                Create budgets, maintain cost details, and keep exchange-rate
                logic consistent across planning and reporting currencies.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <FiShield />
              </div>
              <h3 className={styles.cardTitle}>Control spending safely</h3>
              <p className={styles.cardText}>
                Transactions, allocations, and payment orders work together to
                reduce over-paying and protect approvals.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <FiCheckCircle />
              </div>
              <h3 className={styles.cardTitle}>Support approvals</h3>
              <p className={styles.cardText}>
                Signatures provide a clear approval trail. Once booked, payment
                orders become read-only for safer operations.
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
                  Everything attaches to a project: budgets, transactions,
                  payment orders, signatures, recipients, documents, and
                  reporting.
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
                  Transactions capture approvals and planned funding actions —
                  and connect funding to the budget.
                </p>
              </div>
            </div>

            <div className={styles.flowStep}>
              <div className={styles.flowNumber}>4</div>
              <div className={styles.flowBody}>
                <h3 className={styles.flowTitle}>
                  Payment orders execute spending
                </h3>
                <p className={styles.flowText}>
                  Payment orders group payments, keep totals consistent, and
                  rely on allocations/approvals to reduce risk.
                </p>
              </div>
            </div>

            <div className={styles.flowStep}>
              <div className={styles.flowNumber}>5</div>
              <div className={styles.flowBody}>
                <h3 className={styles.flowTitle}>
                  Signatures and documents close the loop
                </h3>
                <p className={styles.flowText}>
                  Signatures create an approval trail. Documents keep supporting
                  evidence attached to the correct project.
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
                Use consistent names, codes, and classifications so reporting
                stays reliable.
              </p>
            </div>

            <div className={styles.principle}>
              <h3 className={styles.principleTitle}>Accountability</h3>
              <p className={styles.principleText}>
                Keep approvals, payments, and documents connected so you can
                explain what happened and why.
              </p>
            </div>

            <div className={styles.principle}>
              <h3 className={styles.principleTitle}>Operational safety</h3>
              <p className={styles.principleText}>
                Use the project selector and module rules to avoid mixing data
                between projects and exceeding approvals.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={styles.footerNote}>
          <p className={styles.footerText}>
            Tip: If you’re new to the system, start with the{" "}
            <strong>Operational Guide</strong> tab. It explains each module in
            practical, step-by-step terms.
          </p>
        </section>
      </div>
    </div>
  );
};

export default About;
