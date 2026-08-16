import React, { useEffect, useMemo, useState } from "react";
import { FiBriefcase, FiCreditCard, FiFileText, FiPenTool, FiTrendingUp, FiUsers } from "react-icons/fi";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BASE_URL } from "../../../config/api";
import styles from "./ProjectSnapshot.module.scss";

const emptySnapshot = {
  reportingBudgetSek: 0,
  recipients: 0,
  partners: 0,
  transactions: 0,
  paymentOrders: 0,
  signatures: 0,
  documents: 0,
  recipientNames: [],
  partnerNames: [],
  documentNames: [],
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const CHART_COLORS = [
  "var(--color-primary)",
  "var(--color-primary-hover)",
  "var(--color-primary-dark)",
  "color-mix(in srgb, var(--color-primary) 68%, var(--color-success))",
  "color-mix(in srgb, var(--color-primary) 70%, var(--color-warning))",
  "color-mix(in srgb, var(--color-primary) 72%, var(--color-danger))",
  "color-mix(in srgb, var(--color-primary) 58%, var(--color-text-secondary))",
];

export const getParticipantNames = (participants = [], employees = []) => {
  const employeeNames = new Map(
    asArray(employees).map((employee) => {
      const id = employee.id ?? employee.employeeId;
      const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ");
      const label =
        employee.employeeName || employee.fullName || employee.name ||
        fullName || employee.email || `Employee #${id}`;
      return [
        String(id),
        label,
      ];
    })
  );

  return asArray(participants).map((participant) => {
    const employeeId = participant.employeeId ?? participant.employee?.id;
    return employeeNames.get(String(employeeId)) ||
      (employeeId == null ? "Employee" : `Employee #${employeeId}`);
  });
};

export const summarizeProjectSnapshot = ({
  costDetails = [], recipients = [], relations = [], transactions = [],
  paymentOrders = [], signatures = [], documents = [], organizationOptions = [],
}) => {
  const organizationNames = new Map(
    asArray(organizationOptions).map((organization) => [
      String(organization.id ?? organization.organizationId),
      organization.name ?? organization.organizationName,
    ])
  );
  const getOrganizationName = (organizationId) =>
    organizationNames.get(String(organizationId)) ||
    (organizationId == null ? "Organization" : `Organization #${organizationId}`);

  return ({
  reportingBudgetSek: asArray(costDetails).reduce(
    (total, row) => total + numeric(row.amountReportingCurrency), 0
  ),
  recipients: asArray(recipients).length,
  partners: asArray(relations).length,
  transactions: asArray(transactions).length,
  paymentOrders: asArray(paymentOrders).length,
  signatures: asArray(signatures).length,
  documents: asArray(documents).length,
  recipientNames: asArray(recipients).map((recipient) => {
    const directName = recipient.recipientName ?? recipient.name;
    if (directName) return directName;
    const organizationId = recipient.organizationId ?? recipient.organization?.id;
    return organizationId
      ? getOrganizationName(organizationId)
      : recipient.id ?? recipient.recipientId
        ? `Recipient #${recipient.id ?? recipient.recipientId}`
        : "Recipient";
  }),
  partnerNames: asArray(relations).map((relation) => {
    const directName = relation.organizationName ?? relation.organization?.organizationName;
    if (directName) return directName;
    return getOrganizationName(relation.organizationId ?? relation.organization?.id);
  }),
  documentNames: asArray(documents).map(
    (document) => document.documentName ?? document.name ??
      (document.id == null ? "Document" : `Document #${document.id}`)
  ),
});
};

const ActivityTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  const details = asArray(item.details);
  const visibleDetails = details.slice(0, 8);
  const remaining = Math.max(0, details.length - visibleDetails.length);

  return (
    <div className={styles.tooltipBox}>
      <div className={styles.tooltipTitle}>{item.name}</div>
      <div className={styles.tooltipCount}>{item.value} record{item.value === 1 ? "" : "s"}</div>
      {visibleDetails.length > 0 && (
        <ul className={styles.tooltipList}>
          {visibleDetails.map((detail, index) => <li key={`${detail}-${index}`}>{detail}</li>)}
        </ul>
      )}
      {remaining > 0 && <div className={styles.tooltipMore}>+{remaining} more…</div>}
    </div>
  );
};

const ProjectSnapshot = ({ projectId, projectName, participants = [], employees = [] }) => {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId) {
      setSnapshot(emptySnapshot);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const token = localStorage.getItem("authToken");
    const headers = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchList = async (path) => {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers,
        signal: controller.signal,
      });
      if (response.status === 204) return [];
      if (!response.ok) throw new Error(`Could not load ${path}`);
      return asArray(await response.json());
    };

    const loadSnapshot = async () => {
      setLoading(true);
      setError("");
      try {
        const [budgets, transactions, paymentOrders, recipients, signatures, documents, allRelations, organizationOptions] =
          await Promise.all([
            fetchList(`/api/budgets/project/${projectId}`),
            fetchList(`/api/transactions/project/${projectId}`),
            fetchList(`/api/payment-orders/project/${projectId}`),
            fetchList(`/api/recipients/by-project/${projectId}`),
            fetchList(`/api/signatures/by-project/${projectId}`),
            fetchList(`/api/documents/project/${projectId}`),
            fetchList("/api/project-organizations/active"),
            fetchList("/api/organizations/active/options"),
          ]);

        const costDetailGroups = await Promise.all(
          budgets.map((budget) =>
            fetchList(`/api/cost-details/by-budget/${budget.id ?? budget.budgetId}`)
          )
        );
        const relations = allRelations.filter(
          (relation) => String(relation.projectId) === String(projectId)
        );

        setSnapshot(summarizeProjectSnapshot({
          costDetails: costDetailGroups.flat(), recipients, relations, transactions,
          paymentOrders, signatures, documents,
          organizationOptions,
        }));
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          console.error("Failed to load project snapshot:", loadError);
          setError("Project statistics could not be loaded.");
          setSnapshot(emptySnapshot);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadSnapshot();
    return () => controller.abort();
  }, [projectId]);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("sv-SE", {
      style: "currency", currency: "SEK", maximumFractionDigits: 0,
    }), []
  );

  const cards = [
    { label: "Reporting budget", value: currencyFormatter.format(snapshot.reportingBudgetSek), hint: "Cost details in reporting currency", icon: FiTrendingUp },
    { label: "Recipients", value: snapshot.recipients, hint: "Project beneficiaries", icon: FiUsers },
    { label: "Partners", value: snapshot.partners, hint: "Linked organizations", icon: FiBriefcase },
    { label: "Transactions", value: snapshot.transactions, hint: "Funding transactions", icon: FiCreditCard },
    { label: "Payment orders", value: snapshot.paymentOrders, hint: "Payment records", icon: FiFileText },
    { label: "Signatures", value: snapshot.signatures, hint: "Approval records", icon: FiPenTool },
  ];

  const chartData = [
    { name: "Recipients", value: snapshot.recipients, details: snapshot.recipientNames },
    { name: "Partners", value: snapshot.partners, details: snapshot.partnerNames },
    { name: "Transactions", value: snapshot.transactions },
    { name: "Payments", value: snapshot.paymentOrders },
    { name: "Signatures", value: snapshot.signatures },
    { name: "Documents", value: snapshot.documents, details: snapshot.documentNames },
    {
      name: "Participants",
      value: participants.length,
      details: getParticipantNames(participants, employees),
    },
  ].map((item, index) => ({
    ...item,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <section className={styles.snapshot} aria-labelledby="project-snapshot-title">
      <div className={styles.sectionHeader}>
        <div>
          <h3 id="project-snapshot-title" className={styles.sectionTitle}>Project snapshot</h3>
          <p className={styles.sectionSubtitle}>
            Current operational overview for {projectName || `project #${projectId}`}.
          </p>
        </div>
        <span className={styles.liveLabel}>Live project data</span>
      </div>

      {loading && <div className={styles.loadingSkeleton} aria-label="Loading project statistics" />}
      {!loading && error && <div className={styles.errorBanner}>{error}</div>}

      {!loading && !error && <>
        <div className={styles.kpiGrid}>
          {cards.map(({ label, value, hint, icon: Icon }) => (
            <article key={label} className={styles.kpiCard}>
              <div className={styles.iconWrap}><Icon /></div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiLabel}>{label}</span>
                <strong className={styles.kpiValue}>{value}</strong>
                <span className={styles.kpiHint}>{hint}</span>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Operational activity</div>
          <div className={styles.chartSubtitle}>Record counts across the selected project</div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip content={<ActivityTooltip />} cursor={{ fill: "rgba(61, 133, 198, 0.08)" }} />
                <Bar dataKey="value" name="Records" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>}
    </section>
  );
};

export default ProjectSnapshot;
